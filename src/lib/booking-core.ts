/**
 * Booking Core Logic
 * 
 * 予約作成・料金計算・所要時間計算を集約したコアロジック
 * 
 * 【技術負債対策】
 * - ロジックを1箇所に集約することで、将来の変更時の影響範囲を明確化
 * - UIやAPIルートから切り離すことで、ビジネスロジックの再利用性を向上
 * - 処理が多少汚くても構わないが、分散させないことを優先
 */

import { calculateBookingPrice, type CartItem, type Service, type ServiceOption } from './pricing';
import { logger, loggers } from './logger';
import { logAuditEvent } from './audit-log';

export interface BookingCoreInput {
    storeSlug: string;
    cartItems: CartItem[];
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerAddress: string;
    bookingDate: Date;
    paymentMethod: 'online_card' | 'on_site';
}

export interface BookingCoreResult {
    bookingId: string;
    totalAmount: number;
    totalDurationMinutes: number;
    startTime: Date;
    endTime: Date;
    storeId: string;
    organizationId: string;
}

/**
 * 予約作成のコアロジック
 * 
 * 料金計算、所要時間計算、予約作成を一括で処理
 */
export async function createBookingCore(
    supabase: any,
    input: BookingCoreInput
): Promise<BookingCoreResult> {
    loggers.booking('create_start', '', {
        storeSlug: input.storeSlug,
        cartItemsCount: input.cartItems.length,
        bookingDate: input.bookingDate.toISOString(),
    });

    try {
        // 1. 店舗情報取得
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, organization_id')
            .eq('slug', input.storeSlug)
            .single();

        if (storeError || !store) {
            throw new Error(`Store not found: ${input.storeSlug}`);
        }

        const storeId = store.id;
        const orgId = store.organization_id;

        // 2. サービス・オプション取得
        const serviceIds = input.cartItems.map((i) => i.serviceId);
        const optionIds = input.cartItems.flatMap((i) => i.selectedOptions || []);

        const [servicesRes, optionsRes] = await Promise.all([
            supabase.from('services').select('*').in('id', serviceIds),
            optionIds.length > 0
                ? supabase.from('service_options').select('*').in('id', optionIds)
                : Promise.resolve({ data: [] }),
        ]);

        const dbServices: Service[] = (servicesRes.data || []).map((s: any) => ({
            id: s.id,
            price: s.price,
            duration_minutes: s.duration_minutes,
            buffer_minutes: s.buffer_minutes || 0,
        }));

        const dbOptions: ServiceOption[] = (optionsRes as any).data || [];

        // 3. 料金・所要時間計算
        const pricingResult = calculateBookingPrice(
            input.cartItems,
            dbServices,
            dbOptions,
            30 // travel padding
        );

        loggers.booking('pricing_calculated', '', {
            totalAmount: pricingResult.totalAmount,
            totalDurationMinutes: pricingResult.totalDurationMinutes,
            itemCount: pricingResult.itemBreakdown.length,
        });

        // 4. 日時計算
        const startTime = input.bookingDate;
        const endTime = new Date(startTime.getTime() + pricingResult.totalDurationMinutes * 60000);

        // 5. RPC呼び出しで予約作成
        const rpcPayload = {
            slug_input: input.storeSlug,
            customer_name: input.customerName,
            customer_phone: input.customerPhone,
            customer_email: input.customerEmail || '',
            customer_address: input.customerAddress,
            booking_date: startTime.toISOString(),
            cart_items: input.cartItems.map((item) => ({
                serviceId: item.serviceId,
                quantity: item.quantity,
                options: item.selectedOptions || [],
            })),
        };

        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_booking_secure', rpcPayload);

        if (rpcError) {
            logger.error('RPC Error in createBookingCore', { error: rpcError, payload: rpcPayload });
            throw rpcError;
        }

        const bookingId = (rpcResult as any).bookingId;

        // 6. 決済方法・ステータス更新
        const isOnlinePayment = input.paymentMethod === 'online_card';
        const expiresAt = isOnlinePayment ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
        const targetStatus = isOnlinePayment ? 'pending_payment' : 'confirmed';

        const { data: booking, error: updateError } = await supabase
            .from('bookings')
            .update({
                payment_method: input.paymentMethod,
                status: targetStatus,
                expires_at: expiresAt,
            })
            .eq('id', bookingId)
            .select('id')
            .single();

        if (updateError) {
            logger.error('Booking update error after RPC', { error: updateError, bookingId });
            throw updateError;
        }

        loggers.booking('create_success', bookingId, {
            totalAmount: pricingResult.totalAmount,
            status: targetStatus,
        });

        // 監査ログ記録（予約作成）
        await logAuditEvent(supabase, {
            organizationId: orgId,
            storeId: storeId,
            operationType: 'booking.created',
            entityType: 'booking',
            entityId: bookingId,
            metadata: {
                totalAmount: pricingResult.totalAmount,
                status: targetStatus,
                paymentMethod: input.paymentMethod,
            },
        });

        return {
            bookingId,
            totalAmount: pricingResult.totalAmount,
            totalDurationMinutes: pricingResult.totalDurationMinutes,
            startTime,
            endTime,
            storeId,
            organizationId: orgId,
        };
    } catch (error) {
        loggers.error(error, {
            context: 'createBookingCore',
            storeSlug: input.storeSlug,
        });
        throw error;
    }
}

/**
 * 空き枠計算のコアロジック
 * 
 * 入力値と結果をログに記録
 */
export interface AvailabilityCoreInput {
    storeSlug: string;
    date: string; // YYYY-MM-DD
    cartItems: CartItem[];
}

export interface AvailabilityCoreResult {
    availableSlots: string[]; // HH:mm形式
    storeId: string;
    maxCapacity: number;
    totalDuration: number;
}

export async function calculateAvailabilityCore(
    supabase: any,
    input: AvailabilityCoreInput
): Promise<AvailabilityCoreResult> {
    loggers.apiRequest('POST', '/api/availability', undefined, {
        storeSlug: input.storeSlug,
        date: input.date,
        cartItemsCount: input.cartItems.length,
    });

    try {
        // 1. 店舗情報取得
        const { data: stores, error: storeError } = await supabase
            .from('stores')
            .select('id, slug, max_capacity, business_hours, settings')
            .eq('slug', input.storeSlug)
            .limit(1);

        if (storeError || !stores || stores.length === 0) {
            throw new Error(`Store not found: ${input.storeSlug}`);
        }

        const store = stores[0];
        const maxCapacity = store.max_capacity || 3;

        // 2. サービス情報取得して所要時間計算
        const serviceIds = input.cartItems.map((i: any) => i.serviceId);
        const { data: services } = await supabase
            .from('services')
            .select('id, duration_minutes')
            .in('id', serviceIds);

        let totalDuration = 0;
        input.cartItems.forEach((item: any) => {
            const service = services?.find((s: any) => s.id === item.serviceId);
            if (service) {
                totalDuration += service.duration_minutes * (item.quantity || 1);
            }
        });
        totalDuration += 30; // buffer

        // 3. 営業時間取得
        // 【複雑なロジック】営業時間は複数の形式で保存されている可能性があるため、柔軟にパースする
        // - business_hours カラム（直接保存）または settings.business_hours（ネスト保存）の両方をチェック
        // - 曜日名は3文字形式（mon, tue, wed...）で取得
        const { format, parseISO } = await import('date-fns');
        const targetDate = parseISO(input.date);
        const dayName = format(targetDate, 'eee').toLowerCase(); // "mon", "tue", "wed" など

        // 営業時間の取得元を決定（カラム直下 > settings内）
        const bizHours = (store as any).business_hours || (store.settings as any)?.business_hours;
        const hours = bizHours?.[dayName];

        // デフォルト値（営業時間が未設定の場合）
        let openTime = '09:00';
        let closeTime = '18:00';
        let isOpen = true;

        if (hours) {
            // 配列形式: ["09:00", "18:00"] → 最初の要素が開始、2番目が終了
            if (Array.isArray(hours) && hours.length >= 2) {
                openTime = hours[0];
                closeTime = hours[1];
            }
            // オブジェクト形式: { open: "09:00", close: "18:00", isOpen: true }
            else if (typeof hours === 'object') {
                openTime = hours.open || '09:00';
                closeTime = hours.close || '18:00';
                // isOpen が明示的に false の場合は閉店、それ以外は開店
                isOpen = hours.isOpen !== undefined ? hours.isOpen : true;
            }
        }

        if (!isOpen) {
            logger.info('Store is closed', { storeSlug: input.storeSlug, date: input.date, dayName });
            return {
                availableSlots: [],
                storeId: store.id,
                maxCapacity,
                totalDuration,
            };
        }

        // 4. 既存予約取得
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const dayStart = `${dateStr}T00:00:00`;
        const dayEnd = `${dateStr}T23:59:59`;
        const nowIso = new Date().toISOString();

        const { data: dayBookings, error: bookingFetchError } = await supabase
            .from('bookings')
            .select('id,start_time,end_time,status,expires_at')
            .eq('store_id', store.id)
            .neq('status', 'cancelled')
            .gte('end_time', dayStart)
            .lte('start_time', dayEnd);

        if (bookingFetchError) {
            logger.error('Failed to fetch bookings for availability', {
                error: bookingFetchError,
                storeId: store.id,
                date: input.date,
            });
            throw bookingFetchError;
        }

        // 5. 空き枠計算
        // 【複雑なロジック】30分刻みでスロットを生成し、各スロットの重複予約数をカウント
        const { startOfDay, setHours, setMinutes, addMinutes } = await import('date-fns');
        const baseDate = startOfDay(targetDate);
        const [openHour, openMinute] = openTime.split(':').map(Number);
        const [closeHour, closeMinute] = closeTime.split(':').map(Number);

        // 営業開始時刻と終了時刻をDateオブジェクトに変換
        let currentTime = setMinutes(setHours(baseDate, openHour), openMinute);
        const endTime = setMinutes(setHours(baseDate, closeHour), closeMinute);

        const availableSlots: string[] = [];

        // 30分刻みでスロットを生成（例: 09:00, 09:30, 10:00...）
        while (currentTime < endTime) {
            const slotStart = currentTime;
            // スロット終了時刻 = 開始時刻 + サービス所要時間
            const slotEnd = addMinutes(slotStart, totalDuration);

            // サービス終了時刻が営業終了時刻を超える場合は、そのスロット以降は生成しない
            if (slotEnd > endTime) {
                break;
            }

            // 【複雑なロジック】このスロットと重複する既存予約をカウント
            // 重複判定の条件:
            // 1. 予約の開始時刻 <= スロット終了時刻 かつ 予約の終了時刻 >= スロット開始時刻
            // 2. キャンセル済みは除外
            // 3. pending_payment で期限切れのものは除外（15分TTLを過ぎた仮押さえは無効）
            const overlapping = (dayBookings || []).filter((b: any) => {
                // 必須フィールドのチェック
                if (!b.start_time || !b.end_time) return false;
                
                // pending_payment の場合は expires_at をチェック
                // 期限切れの pending_payment は「仮押さえが解除された」とみなす
                const expiresOk = b.status !== 'pending_payment' || !b.expires_at || b.expires_at > nowIso;
                if (!expiresOk) return false;
                
                // 時間の重なり判定: 予約期間とスロット期間が重なっているか
                const start = new Date(b.start_time);
                const end = new Date(b.end_time);
                // 重複条件: 予約開始 <= スロット終了 かつ 予約終了 >= スロット開始
                return start <= slotEnd && end >= slotStart;
            });

            // このスロット時点での既存予約数と残りキャパシティを計算
            const existingBookings = overlapping.length;
            const remainingCapacity = maxCapacity - existingBookings;

            // 残りキャパシティがあれば、このスロットを利用可能として追加
            if (remainingCapacity > 0) {
                availableSlots.push(format(slotStart, 'HH:mm'));
            }

            // 次の30分刻みスロットへ進む
            currentTime = addMinutes(currentTime, 30);
        }

        logger.info('Availability calculated', {
            storeSlug: input.storeSlug,
            date: input.date,
            totalDuration,
            maxCapacity,
            existingBookings: dayBookings?.length || 0,
            availableSlotsCount: availableSlots.length,
        });

        return {
            availableSlots,
            storeId: store.id,
            maxCapacity,
            totalDuration,
        };
    } catch (error) {
        loggers.error(error, {
            context: 'calculateAvailabilityCore',
            storeSlug: input.storeSlug,
            date: input.date,
        });
        throw error;
    }
}

