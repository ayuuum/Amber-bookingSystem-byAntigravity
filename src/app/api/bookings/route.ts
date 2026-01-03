import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { bookingSchema } from '@/components/features/booking/schema';
import { sendBookingConfirmationLine } from '@/lib/line/notifications';
import { syncBookingToGoogleCalendar } from '@/lib/google/sync';
import { logAuditEvent } from '@/lib/audit-log';
import { getPlanAccess } from '@/lib/plan/access';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { calculateBookingPrice } from '@/lib/pricing';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// ... imports remain same ...

// Define extended schema to include cartItems
const cartItemSchema = z.object({
    serviceId: z.string(),
    quantity: z.number().min(1),
    selectedOptions: z.array(z.string()).optional()
});

const apiBookingSchema = bookingSchema.extend({
    date: z.coerce.date(),
    cartItems: z.array(cartItemSchema).optional(), // Optional for legacy? No, make required for new flow
    idToken: z.string().nullable().optional(), // LINE IDトークン（LIFF経由の場合）
    line_user_id: z.string().nullable().optional(), // LINEユーザーID（LIFF経由の場合）
});

export async function POST(request: Request) {
    try {
        // 未ログインユーザーから呼ばれるため、Service Roleクライアントを使用（RLSバイパス）
        const supabase = createServiceRoleClient();
        const body = await request.json();

        // Validate input data
        const validatedData = apiBookingSchema.parse(body);
        const { cartItems, idToken, line_user_id } = validatedData;

        // idTokenの処理（nullの場合は通常のWeb予約として扱う）
        // idTokenがある場合はLINE認証として扱う（将来的に検証ロジックを追加可能）
        if (idToken !== undefined && idToken !== null) {
            // TODO: IDトークンの検証（必要に応じて実装）
            logger.info('LINE ID token received', { hasToken: !!idToken });
        }

        if (!cartItems || cartItems.length === 0) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('カートにサービスが入っていません。'));
        }

        // 1. Get Store ID from Slug
        const slug = (body as any).slug; // Extract slug from payload
        if (!slug) return errorResponse(AmberErrors.VALIDATION_ERROR('店舗情報が指定されていません。'));

        // Use RPC or direct select if RPC not available (for MVP select is fine if RLS allows or we use admin client)
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, organization_id')
            .eq('slug', slug)
            .single();

        if (storeError || !store) return errorResponse(AmberErrors.NOT_FOUND('店舗'));
        const storeId = store.id;
        const orgId = store.organization_id;

        // 2. Service Area Validation
        const { data: areas } = await supabase
            .from('service_areas')
            .select('prefecture, city')
            .eq('store_id', storeId);

        if (areas && areas.length > 0) {
            const address = validatedData.address;
            const isCovered = areas.some(area => address.includes(area.prefecture) && address.includes(area.city));
            if (!isCovered) {
                return NextResponse.json({ error: 'Selected address is out of service area.' }, { status: 400 });
            }
        }

        // 3. Calculate Totals (Duration & Price) from DB
        // Fetch all involved services & options to be safe (trust DB, not client)
        const serviceIds = cartItems.map(i => i.serviceId);
        const optionIds = cartItems.flatMap(i => i.selectedOptions || []);

        // Parallel Fetch
        const [servicesRes, optionsRes] = await Promise.all([
            supabase.from('services').select('*').in('id', serviceIds),
            optionIds.length > 0 ? supabase.from('service_options').select('*').in('id', optionIds) : Promise.resolve({ data: [], error: null })
        ]);

        // エラーチェック
        if (servicesRes.error) {
            logger.error('Error fetching services', { error: servicesRes.error, serviceIds });
            return errorResponse(AmberErrors.DATABASE_ERROR(servicesRes.error.message));
        }
        if (optionsRes.error) {
            logger.error('Error fetching service options', { error: optionsRes.error, optionIds });
            return errorResponse(AmberErrors.DATABASE_ERROR(optionsRes.error.message));
        }

        const dbServices = servicesRes.data || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbOptions = (optionsRes as any).data || [];

        // 料金・所要時間の計算（pricing.tsの統一ロジックを使用）
        const pricingResult = calculateBookingPrice(
            cartItems,
            dbServices.map((s: any) => ({
                id: s.id,
                price: s.price,
                duration_minutes: s.duration_minutes,
                buffer_minutes: s.buffer_minutes || 0,
            })),
            dbOptions,
            30 // travel padding
        );

        const totalDurationMinutes = pricingResult.totalDurationMinutes;
        const totalAmount = pricingResult.totalAmount;

        // 4. 予約開始・終了時刻の計算
        // 開始時刻 = 顧客が選択した日時
        const startTime = validatedData.date;
        // 終了時刻 = 開始時刻 + 合計所要時間（ミリ秒に変換して加算）
        const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60000);

        // 5. スタッフアサイン（担当者割り当て）
        // 【複雑なロジック】予約日時の曜日に対応するスタッフスケジュールから担当者を選定
        // Phase 1.1 では簡易的なロジック（ランダム選択）を使用
        // 将来的には位置情報・スキル・稼働状況を考慮した最適アサインに改善予定
        const dayOfWeek = startTime.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
        
        // 予約日時の曜日にシフトがあるスタッフを取得
        const { data: candidates } = await supabase
            .from('staff_schedules')
            .select('staff_id')
            .eq('day_of_week', dayOfWeek);

        // スタッフアサイン（簡易版: ランダム選択）
        let assignedStaffId: string | null = null;
        if (candidates && candidates.length > 0) {
            // 候補スタッフをランダムにシャッフルして最初の1名を選定
            const shuffled = candidates.sort(() => 0.5 - Math.random());
            assignedStaffId = shuffled[0].staff_id;
        } else {
            // 該当曜日にシフトがない場合は、アクティブなスタッフから1名を選定（フォールバック）
            const { data: anyStaff } = await supabase.from('staff').select('id').eq('is_active', true).limit(1);
            if (anyStaff) assignedStaffId = anyStaff[0].id;
        }

        // NOTE: Customer creation is now handled by the RPC (create_booking_secure)
        // The RPC performs upsert based on phone number within the store context
        // This eliminates duplicate logic and ensures consistency

        // ... (validation logic remains) ...

        // 7. Call Secure RPC
        // We pass the validated data to the Postgres Function.
        // The Function runs with Security Definer, allowing it to Insert even if Anon RLS is strict.

        // Construct Payload for RPC
        const rpcPayload = {
            slug_input: slug,
            customer_name: `${validatedData.lastName} ${validatedData.firstName}`.trim(),
            customer_phone: validatedData.phone,
            customer_email: validatedData.email || '',
            customer_address: validatedData.address,
            booking_date: validatedData.date.toISOString(),
            cart_items: cartItems.map(item => ({
                serviceId: item.serviceId,
                quantity: item.quantity,
                options: item.selectedOptions || []
            }))
        };

        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_booking_secure', rpcPayload);

        if (rpcError) {
            logger.error('RPC Error', { error: rpcError, slug, rpcPayload });
            return errorResponse(AmberErrors.DATABASE_ERROR(rpcError.message));
        }

        const bookingId = (rpcResult as any).bookingId;
        const customerId = (rpcResult as any).customerId;

        // LINEユーザーIDがある場合は顧客テーブルを更新
        if (line_user_id && customerId) {
            try {
                await supabase
                    .from('customers')
                    .update({ line_user_id: line_user_id })
                    .eq('id', customerId);
                logger.info('Updated customer with LINE user ID', {
                    customerId,
                    lineUserId: line_user_id,
                });
            } catch (error) {
                // エラーが発生しても予約は成功扱い
                logger.warn('Failed to update customer with LINE user ID (non-blocking)', {
                    error,
                    customerId,
                    lineUserId: line_user_id,
                });
            }
        }

        // Update payment method & get full info for notification
        const isOnlinePayment = validatedData.paymentMethod === 'online_card';
        const expiresAt = isOnlinePayment ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
        const targetStatus = isOnlinePayment ? 'pending_payment' : 'confirmed';

        const { data: booking, error: updateError } = await supabase
            .from('bookings')
            .update({
                payment_method: validatedData.paymentMethod,
                status: targetStatus,
                expires_at: expiresAt,
            })
            .eq('id', bookingId)
            .select('*, customers(*), booking_items(*, services(*))')
            .single();

        if (updateError) {
            logger.error('Booking update error after RPC', { error: updateError, bookingId });
            return errorResponse(AmberErrors.DATABASE_ERROR(updateError.message));
        }

        // 監査ログ記録（予約作成）
        if (booking && orgId && storeId) {
            await logAuditEvent(supabase, {
                organizationId: orgId,
                storeId: storeId,
                operationType: 'booking.created',
                entityType: 'booking',
                entityId: bookingId,
                metadata: {
                    totalAmount: booking.total_amount,
                    status: targetStatus,
                    paymentMethod: validatedData.paymentMethod,
                },
            });
        }

        // Plan Guard: Check Feature Access (LINE & Google Calendar)
        const planAccess = await getPlanAccess(orgId);

        // イベント駆動アーキテクチャ: 予約作成イベントを発行
        // デュアルモード: 環境変数 USE_EVENT_SYSTEM が true の場合のみイベント発行
        // それ以外は既存の同期処理を実行（後方互換性のため）
        const useEventSystem = process.env.USE_EVENT_SYSTEM === 'true';

        if (useEventSystem) {
            // イベント発行（非同期処理）
            const { publishEvent } = await import('@/lib/events/publisher');
            await publishEvent(supabase, {
                eventType: 'booking.created',
                entityType: 'booking',
                entityId: bookingId,
                payload: {
                    booking,
                    planAccess,
                },
                maxRetries: 3,
            });
        } else {
            // 既存の同期処理（デュアルモード）
            // 【技術負債対策】外部連携の失敗が予約作成を阻害しないよう、try/catchで分離
            // If on_site, send LINE notification immediately (Growth+ only)
            // 失敗しても予約は成功扱い
            if (validatedData.paymentMethod === 'on_site' && booking?.customers?.line_user_id && planAccess.canUseLine) {
                try {
                    const { sendBookingConfirmationLine } = await import('@/lib/line/notifications');
                    await sendBookingConfirmationLine(booking.customers.line_user_id, booking);
                } catch (error) {
                    logger.error('LINE notification failed (non-blocking)', {
                        error,
                        bookingId,
                        lineUserId: booking.customers.line_user_id,
                    });
                    // 予約は成功扱いのまま続行
                }
            }

            // Also Sync to Google Calendar (Growth+ only)
            // 失敗しても予約は成功扱い
            if (booking?.staff_id && planAccess.canUseGoogleCalendar) {
                try {
                    const { data: staff } = await supabase.from('staff').select('*').eq('id', booking.staff_id).single();
                    if (staff?.google_refresh_token) {
                        const { syncBookingToGoogleCalendar } = await import('@/lib/google/sync');
                        const googleEventId = await syncBookingToGoogleCalendar(staff, booking);
                        if (googleEventId) {
                            await supabase.from('bookings').update({ google_event_id: googleEventId }).eq('id', bookingId);
                        }
                    }
                } catch (error) {
                    logger.error('Google Calendar sync failed (non-blocking)', {
                        error,
                        bookingId,
                        staffId: booking.staff_id,
                    });
                    // 予約は成功扱いのまま続行
                }
            }
        }

        // 予約成功レスポンス（通知結果を含める）
        const responseData = {
            ...rpcResult,
            notificationChannel: booking?.customers?.line_user_id ? 'line' : null,
        };

        return NextResponse.json(responseData);

    } catch (error: any) {
        logger.error('Booking API Error', { error });
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
