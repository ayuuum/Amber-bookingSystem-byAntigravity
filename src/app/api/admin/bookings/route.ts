/**
 * Admin Bookings API
 * 
 * 管理画面用の予約一覧取得エンドポイント
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, ApiContext } from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { AmberErrors, errorResponse } from "@/lib/errors";

/**
 * 予約データのレスポンス型（SupabaseのJOIN結果を整形）
 */
interface BookingResponse {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    payment_status: string | null;
    payment_method: string | null;
    total_amount: number | null;
    notes: string | null;
    organization_id: string;
    store_id: string;
    customers: {
        id: string;
        full_name: string;
        phone: string;
        address: string | null;
    } | null;
    staff: {
        id: string;
        name: string;
    } | null;
    booking_items: Array<{
        quantity: number;
        unit_price: number;
        subtotal: number;
        services: {
            title: string;
        } | null;
        booking_item_options: Array<{
            price: number;
            service_options: {
                name: string;
            } | null;
        }>;
    }>;
}

/**
 * GET /api/admin/bookings
 * 
 * 管理画面用の予約一覧を取得します。
 * 認証されたユーザーの組織に属する予約のみを返します。
 * 
 * @param request - Next.js Request オブジェクト（未使用だがNext.jsのルーティング要件のため必要）
 * @returns 予約一覧のJSONレスポンス（最大100件、最新順）
 * 
 * @throws {401} 認証されていない場合
 * @throws {403} 組織IDが見つからない場合
 * @throws {500} データベースエラーが発生した場合
 * 
 * @example
 * ```typescript
 * GET /api/admin/bookings
 * Response: [
 *   {
 *     id: "uuid",
 *     start_time: "2025-01-27T10:00:00Z",
 *     customers: { id: "...", full_name: "山田太郎", ... },
 *     ...
 *   }
 * ]
 * ```
 */
async function getHandler(request: NextRequest, context: ApiContext) {
    const { user, supabase } = context;
    
    logger.info('[Admin Bookings] Request started', { userId: user.id });

    // 組織IDの取得（contextから取得、なければメタデータから）
    let organizationId: string | null = user.organizationId;

    if (!organizationId) {
        logger.debug('[Admin Bookings] Organization ID not in context, checking metadata');
        // フォールバック: メタデータから取得を試みる
        const { data: { user: authUser } } = await supabase.auth.getUser();
        organizationId = authUser?.user_metadata?.organization_id || null;
    }

    if (!organizationId) {
        logger.warn('[Admin Bookings] No organization ID found for user', { userId: user.id });
        return errorResponse(AmberErrors.AUTH_ORG_ACCESS_DENIED());
    }

    logger.info('[Admin Bookings] Organization ID resolved', { 
        userId: user.id,
        organizationId 
    });

        // 予約一覧の取得
        const { data, error } = await supabase
            .from("bookings")
            .select(`
                id,
                start_time,
                end_time,
                status,
                payment_status,
                payment_method,
                total_amount,
                notes,
                organization_id,
                store_id,
                customers ( id, full_name, phone, address ),
                staff ( id, name ),
                booking_items (
                    quantity,
                    unit_price,
                    subtotal,
                    services ( title ),
                    booking_item_options (
                        price,
                        service_options ( name )
                    )
                )
            `)
            .eq("organization_id", organizationId)
            .order("start_time", { ascending: false })
            .limit(100);

        if (error) {
            logger.error('[Admin Bookings] Database query failed', { 
                error: error.message,
                code: error.code,
                organizationId 
            });
            return errorResponse(AmberErrors.DATABASE_ERROR(error.message));
        }

        // SupabaseのJOIN結果は配列で返されることがあるため、単一オブジェクトに整形
        // クライアント側の既存ロジックが単一オブジェクトを期待しているため
        const formattedData: BookingResponse[] = (data || []).map((booking: any) => ({
            ...booking,
            customers: Array.isArray(booking.customers) 
                ? booking.customers[0] || null 
                : booking.customers || null,
            staff: Array.isArray(booking.staff) 
                ? booking.staff[0] || null 
                : booking.staff || null,
        }));

    logger.info('[Admin Bookings] Request completed successfully', { 
        bookingCount: formattedData.length,
        organizationId 
    });

    // 空配列でも正常なレスポンスとして返す（予約0件はエラーではない）
    return NextResponse.json(formattedData);
}

// withAuthミドルウェアでラップ
export const GET = withAuth(getHandler);
