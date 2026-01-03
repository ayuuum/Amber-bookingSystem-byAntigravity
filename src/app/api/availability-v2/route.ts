import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { format, parseISO, addMinutes, setHours, setMinutes, startOfDay } from 'date-fns';
import { getStoreBusinessHours } from '@/lib/booking-logic';

/**
 * Simplified Availability API (Phase 1 MVP)
 * 
 * Uses capacity-based logic instead of complex staff scheduling.
 * Calculation: remaining_slots = max_capacity - existing_bookings_count
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { date, cartItems, storeSlug } = body;

        // Fallback for legacy calls
        if (!cartItems && body.serviceId) {
            cartItems = [{ serviceId: body.serviceId, quantity: 1 }];
        }

        if (!date || !cartItems || cartItems.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Get Store with max_capacity
        const { data: stores, error: storeError } = await supabase
            .from('stores')
            .select('id, slug, max_capacity, business_hours, settings')
            .eq('slug', storeSlug)
            .limit(1);

        if (storeError || !stores || stores.length === 0) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const store = stores[0];
        const maxCapacity = store.max_capacity || 3; // Default to 3 if not set

        // 2. Calculate Total Service Duration
        const serviceIds = cartItems.map((i: any) => i.serviceId);
        const { data: services } = await supabase
            .from('services')
            .select('id, duration_minutes')
            .in('id', serviceIds);

        let totalDuration = 0;
        cartItems.forEach((item: any) => {
            const service = services?.find(s => s.id === item.serviceId);
            if (service) {
                totalDuration += service.duration_minutes * (item.quantity || 1);
            }
        });
        totalDuration += 30; // Add buffer time

        // 3. 指定日の営業時間を取得（booking-logic.tsの統一ロジックを使用）
        const targetDate = parseISO(date);
        // getStoreBusinessHours accepts partial Store type (uses business_hours and settings)
        const businessHours = getStoreBusinessHours(store as any, targetDate);

        // If store is closed, return empty array
        if (!businessHours || !businessHours.isOpen) {
            return NextResponse.json([]);
        }

        const openTime = businessHours.open;
        const closeTime = businessHours.close;

        // 4. Fetch bookings of the day (exclude cancelled, exclude expired pending_payment)
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
            console.error('Availability bookings fetch error:', bookingFetchError);
            return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
        }

        // 5. Generate Time Slots
        const baseDate = startOfDay(targetDate);
        const [openHour, openMinute] = openTime.split(':').map(Number);
        const [closeHour, closeMinute] = closeTime.split(':').map(Number);

        let currentTime = setMinutes(setHours(baseDate, openHour), openMinute);
        const endTime = setMinutes(setHours(baseDate, closeHour), closeMinute);

        const availableSlots: string[] = [];

        // 5. Check Each Slot
        while (currentTime < endTime) {
            const slotStart = currentTime;
            const slotEnd = addMinutes(slotStart, totalDuration);

            // Stop if service would end after closing
            if (slotEnd > endTime) {
                break;
            }

            // 【複雑なロジック】このスロットと重複する既存予約をカウント
            // 重複判定の条件:
            // 1. 予約の開始時刻 <= スロット終了時刻 かつ 予約の終了時刻 >= スロット開始時刻
            //    これにより、予約期間とスロット期間が時間的に重なっているかを判定
            // 2. キャンセル済み（status = 'cancelled'）は除外（既にクエリで除外済み）
            // 3. pending_payment で期限切れのものは除外
            //    → 15分TTLを過ぎた仮押さえは「予約が解除された」とみなし、キャパシティ計算から除外
            const overlapping = (dayBookings || []).filter(b => {
                // 必須フィールドのチェック
                if (!b.start_time || !b.end_time) return false;
                
                // pending_payment の場合は expires_at をチェック
                // 期限切れの pending_payment は「仮押さえが解除された」とみなす
                const expiresOk = b.status !== 'pending_payment' || !b.expires_at || b.expires_at > nowIso;
                if (!expiresOk) return false;
                
                // 時間の重なり判定
                const start = new Date(b.start_time);
                const end = new Date(b.end_time);
                // 重複条件: 予約開始 <= スロット終了 かつ 予約終了 >= スロット開始
                // 例: 予約 [09:00-11:00] と スロット [10:00-11:30] は重複（10:00-11:00が重なる）
                return start <= slotEnd && end >= slotStart;
            });

            // このスロット時点での既存予約数と残りキャパシティを計算
            // 残りキャパシティ = 最大同時対応数 - 既存予約数
            const existingBookings = overlapping.length;
            const remainingCapacity = maxCapacity - existingBookings;

            // 残りキャパシティがあれば、このスロットを利用可能として追加
            if (remainingCapacity > 0) {
                availableSlots.push(format(slotStart, 'HH:mm'));
            }

            // Move to next 30-minute interval
            currentTime = addMinutes(currentTime, 30);
        }

        return NextResponse.json(availableSlots);

    } catch (error: any) {
        console.error('Availability API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
