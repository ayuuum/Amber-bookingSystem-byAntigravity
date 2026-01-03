import { addMinutes, areIntervalsOverlapping, format, isWithinInterval, parse, setHours, setMinutes, startOfDay } from 'date-fns';
import { Booking, Shift, Store } from '@/types';

export interface TimeSlot {
    start: Date;
    end: Date;
    available: boolean;
    availableStaffIds: string[];
}

export interface BusinessHours {
    open: string; // "09:00"
    close: string; // "18:00"
    isOpen: boolean;
}

/**
 * 店舗の営業時間を取得・検証する
 * 
 * 【複雑なロジック】営業時間は複数の形式で保存されている可能性があるため、柔軟にパースする
 * - business_hours カラム（直接保存）または settings.business_hours（ネスト保存）の両方をチェック
 * - 配列形式 ["09:00", "18:00"] とオブジェクト形式 { open: "09:00", close: "18:00", isOpen: true } の両方に対応
 */
export function getStoreBusinessHours(store: Store, date: Date): BusinessHours | null {
    const bizHours = (store as any).business_hours;
    const settings = store.settings as any;

    // 営業時間の取得元を決定（カラム直下 > settings内）
    const hoursSource = bizHours || settings?.business_hours;

    if (!hoursSource) return null;

    // 曜日名を3文字形式（mon, tue, wed...）で取得
    // date-fns の 'eee' フォーマットは "Mon", "Tue" などを返すが、小文字化して "mon", "tue" に統一
    const dayName = format(date, 'eee').toLowerCase();
    const hours = hoursSource[dayName];

    // その曜日の営業時間が未設定の場合は閉店扱い
    if (!hours) return { open: '09:00', close: '18:00', isOpen: false };

    // オブジェクト形式: { open: "09:00", close: "18:00", isOpen: true }
    if (typeof hours === 'object' && !Array.isArray(hours)) {
        return {
            open: hours.open || '09:00',
            close: hours.close || '18:00',
            // isOpen が明示的に false の場合は閉店、それ以外は開店
            isOpen: hours.isOpen !== undefined ? hours.isOpen : true
        };
    }

    // 配列形式: ["09:00", "18:00"] → 最初の要素が開始時刻、2番目が終了時刻
    if (Array.isArray(hours) && hours.length >= 2) {
        return {
            open: hours[0],
            close: hours[1],
            isOpen: true
        };
    }

    // フォーマットが不正な場合は閉店扱い
    return { open: '09:00', close: '18:00', isOpen: false };
}

/**
 * Core Booking Algorithm
 * Calculates available slots for a specific date given store hours, staff shifts, and existing bookings.
 */
export function calculateAvailableSlots(
    date: Date,
    serviceDuration: number,
    store: Store,
    shifts: Shift[],
    bookings: Booking[],
    intervalMinutes: number = 30
): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // 1. Determine Operating Window
    // For simplicity, we use the store business hours as the base window.
    // If no business hours defined, assume 09:00 - 18:00.
    let openTimeStr = '09:00';
    let closeTimeStr = '18:00';

    const bizHours = getStoreBusinessHours(store, date);
    if (bizHours && bizHours.isOpen) {
        openTimeStr = bizHours.open;
        closeTimeStr = bizHours.close;
    } else if (bizHours && !bizHours.isOpen) {
        // Store is closed today
        return [];
    }

    // Parse open/close times for the specific date
    const baseDate = startOfDay(date);
    const [openHour, openMinute] = openTimeStr.split(':').map(Number);
    const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);

    let currentTime = setMinutes(setHours(baseDate, openHour), openMinute);
    const endTime = setMinutes(setHours(baseDate, closeHour), closeMinute);

    // 2. Iterate through slots
    while (currentTime < endTime) {
        const slotStart = currentTime;
        const slotEnd = addMinutes(slotStart, serviceDuration);

        // Stop if the service would end after closing time
        if (slotEnd > endTime) {
            break;
        }

        // 3. このスロットで利用可能なスタッフを検索
        // 【複雑なロジック】スタッフが利用可能な条件:
        // a. スタッフのシフトがスロット期間 [slotStart, slotEnd] を完全にカバーしている
        // b. スタッフにそのスロット期間と重複する既存予約がない

        const availableStaff = shifts.filter(shift => {
            const shiftStart = new Date(shift.start_time);
            const shiftEnd = new Date(shift.end_time);

            // シフトがスロット期間を完全にカバーしているかチェック
            // 条件: シフト開始 <= スロット開始 かつ シフト終了 >= スロット終了
            // （スロットがシフトの範囲内に完全に収まっている必要がある）
            const shiftCovers = shiftStart <= slotStart && shiftEnd >= slotEnd;

            if (!shiftCovers) return false;

            // このスタッフの既存予約を取得
            const staffBookings = bookings.filter(b => b.staff_id === shift.staff_id);
            
            // 【複雑なロジック】スロット期間と既存予約が重複しているかチェック
            // 重複判定: 予約期間とスロット期間が時間的に重なっている
            // date-fns の areIntervalsOverlapping を使用して正確に判定
            const hasConflict = staffBookings.some(booking => {
                const bookingStart = new Date(booking.start_time);
                const bookingEnd = new Date(booking.end_time);

                return areIntervalsOverlapping(
                    { start: slotStart, end: slotEnd },
                    { start: bookingStart, end: bookingEnd }
                );
            });

            // 重複がなければ利用可能
            return !hasConflict;
        });

        if (availableStaff.length > 0) {
            slots.push({
                start: slotStart,
                end: slotEnd,
                available: true,
                availableStaffIds: availableStaff.map(s => s.staff_id),
            });
        } else {
            // Optionally push unavailable slots if we want to show them as "Booked"
            slots.push({
                start: slotStart,
                end: slotEnd,
                available: false,
                availableStaffIds: []
            });
        }

        // Advance to next interval
        currentTime = addMinutes(currentTime, intervalMinutes);
    }

    return slots;
}
