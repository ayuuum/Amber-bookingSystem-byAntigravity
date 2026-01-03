/**
 * Services API
 * 
 * サービス（清掃メニュー）の取得・作成・更新エンドポイント
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { withAuth, ApiContext } from '@/lib/api/middleware';
import { z } from 'zod';

/**
 * サービス作成・更新用のZodスキーマ
 * すべての入力検証を一箇所で管理
 */
const serviceRequestSchema = z.object({
    id: z.string().uuid().optional(),
    store_id: z.string().uuid('店舗IDは有効なUUIDである必要があります。'),
    title: z.string()
        .min(1, 'サービス名は必須です。')
        .max(100, 'サービス名は100文字以内で入力してください。')
        .trim(),
    duration_minutes: z.number()
        .int('所要時間は整数である必要があります。')
        .min(1, '所要時間は1分以上である必要があります。')
        .max(480, '所要時間は480分（8時間）以下である必要があります。')
        .refine((val) => val % 15 === 0, {
            message: '所要時間は15分刻みで入力してください。',
        }),
    price: z.number()
        .min(0, '料金は0円以上である必要があります。')
        .max(10000000, '料金は10,000,000円以下である必要があります。'),
    description: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
});

/**
 * サービス作成・更新用のリクエストボディ型（Zodスキーマから推論）
 */
type ServiceRequest = z.infer<typeof serviceRequestSchema>;

/**
 * GET /api/services
 * 
 * サービス一覧を取得します。
 * 公開APIとして、店舗のslugを指定してサービス一覧を取得できます。
 * 
 * @param request - Next.js Request オブジェクト（クエリパラメータ `slug` を含む）
 * @returns サービス一覧のJSONレスポンス
 * 
 * @throws {404} 指定されたslugの店舗が見つからない場合
 * @throws {500} データベースエラーが発生した場合
 * 
 * @example
 * ```typescript
 * GET /api/services?slug=store-slug
 * Response: [
 *   {
 *     id: "uuid",
 *     title: "基本清掃",
 *     price: 5000,
 *     duration_minutes: 60,
 *     options: [...]
 *   }
 * ]
 * ```
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');
        const supabase = await createClient();

        let query = supabase.from('services').select(`
            *,
            options:service_options(*)
        `);

        if (slug) {
            // Resolve store_id from slug directly from table
            const { data: storeData, error: storeError } = await supabase
                .from('stores')
                .select('id')
                .eq('slug', slug)
                .limit(1);

            if (storeError || !storeData || storeData.length === 0) {
                return errorResponse(AmberErrors.NOT_FOUND('店舗'));
            }
            const storeId = storeData[0].id;
            query = query.eq('store_id', storeId);
        } else {
            // slugが指定されていない場合は空配列を返す（セキュリティのため全データを返さない）
            logger.debug('[Services API] No slug provided, returning empty array');
            return NextResponse.json([]);
        }

        const { data: services, error } = await query.order('price', { ascending: true });

        if (error) {
            logger.error('Error fetching services', { error, slug });
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        return NextResponse.json(services);
    } catch (error: any) {
        logger.error('Services API error', { error });
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

/**
 * POST /api/services
 * 
 * 新しいサービスを作成、または既存のサービスを更新します。
 * 認証が必要で、store_admin 以上の権限が必要です。
 * 
 * @param request - Next.js Request オブジェクト（サービス情報を含むJSONボディ）
 * @returns 作成・更新されたサービス情報のJSONレスポンス
 * 
 * @throws {401} 認証されていない場合
 * @throws {403} 権限が不足している場合、またはプロフィールが見つからない場合
 * @throws {400} バリデーションエラー（必須フィールド不足、数値範囲外など）
 * @throws {500} データベースエラーが発生した場合
 * 
 * @example
 * ```typescript
 * POST /api/services
 * Body: {
 *   store_id: "uuid",
 *   title: "基本清掃",
 *   duration_minutes: 60,
 *   price: 5000,
 *   description: "基本的な清掃サービス",
 *   category: "regular"
 * }
 * Response: { id: "uuid", ... }
 * ```
 */
async function postHandler(request: NextRequest, context: ApiContext) {
    const { user, supabase } = context;
    
    logger.info('[Services API] POST request started', { userId: user.id });

        // リクエストボディの取得とZodスキーマによる検証
        const rawBody = await request.json();
        const validationResult = serviceRequestSchema.safeParse(rawBody);

        if (!validationResult.success) {
            const errors = validationResult.error.errors.map((err) => {
                const path = err.path.join('.');
                return `${path}: ${err.message}`;
            }).join(', ');
            
            logger.warn('[Services API] Validation failed', { 
                errors: validationResult.error.errors,
                userId: user.id 
            });
            return errorResponse(AmberErrors.VALIDATION_ERROR(`入力データに問題があります: ${errors}`));
        }

        const body = validationResult.data;
        const { id, store_id, title, duration_minutes, price, description, category } = body;

        const serviceData = {
            store_id,
            title,
            duration_minutes,
            price,
            description: description || null,
            category: category || null,
            is_active: true
        };

        // サービスデータの作成・更新
        let result;
        if (id) {
            // 更新
            logger.info('[Services API] Updating service', { serviceId: id, userId: user.id });
            result = await supabase
                .from('services')
                .update(serviceData)
                .eq('id', id)
                .select()
                .single();
        } else {
            // 作成: 店舗の組織IDを取得してサービスに紐付け
            logger.info('[Services API] Creating new service', { storeId: store_id, userId: user.id });
            const { data: store } = await supabase
                .from('stores')
                .select('organization_id')
                .eq('id', store_id)
                .single();
                
            if (!store?.organization_id) {
                logger.error('[Services API] Store not found or missing organization_id', { storeId: store_id });
                return errorResponse(AmberErrors.NOT_FOUND('店舗'));
            }
            
            result = await supabase
                .from('services')
                .insert({ ...serviceData, organization_id: store.organization_id })
                .select()
                .single();
        }

        if (result.error) {
            logger.error('[Services API] Database operation failed', { 
                error: result.error.message,
                code: result.error.code,
                operation: id ? 'update' : 'create',
                serviceData 
            });
            
            // permission deniedエラーを検出して403を返す
            const errorMessage = result.error.message || '';
            if (errorMessage.includes('permission denied') || 
                (errorMessage.includes('relation') && errorMessage.includes('does not exist'))) {
                return errorResponse(AmberErrors.FORBIDDEN());
            }
            
            // その他のデータベースエラーは500
            return errorResponse(AmberErrors.DATABASE_ERROR(result.error.message));
        }

        logger.info('[Services API] Service saved successfully', { 
            serviceId: result.data?.id,
            operation: id ? 'update' : 'create',
            userId: user.id 
        });

        return NextResponse.json(result.data);
}

// withAuthミドルウェアでラップ
export const POST = withAuth(postHandler);
