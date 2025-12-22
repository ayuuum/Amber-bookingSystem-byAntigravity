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
 * Validates if the store is open on the given date based on settings.
 */
export function getStoreBusinessHours(store: Store, date: Date): BusinessHours | null {
    const settings = store.settings as any;
    if (!settings?.business_hours) return null;

    const dayName = format(date, 'EEEE').toLowerCase(); // sunday, monday, etc.
    const hours = settings.business_hours[dayName];

    if (!hours || !hours.isOpen) {
        return { open: '09:00', close: '18:00', isOpen: false }; // Default closed or specific closed
    }
    return hours;
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

        // 3. Find available staff for this slot
        // Staff S is available if:
        // a. S has a shift covering [slotStart, slotEnd]
        // b. S has NO bookings overlapping [slotStart, slotEnd]

        const availableStaff = shifts.filter(shift => {
            const shiftStart = new Date(shift.start_time);
            const shiftEnd = new Date(shift.end_time);

            // Check if shift fully covers the service duration
            const coversSlot = isWithinInterval(slotStart, { start: shiftStart, end: shiftEnd }) &&
                isWithinInterval(slotEnd, { start: shiftStart, end: shiftEnd }); // Strictly, end match might be tricky with inclusive/exclusive. 
            // Logic: shift.end >= slotEnd && shift.start <= slotStart
            // Let's use simpler logic:
            const shiftCovers = shiftStart <= slotStart && shiftEnd >= slotEnd;

            if (!shiftCovers) return false;

            // Check conflicts
            // Find bookings for this staff
            const staffBookings = bookings.filter(b => b.staff_id === shift.staff_id);
            const hasConflict = staffBookings.some(booking => {
                const bookingStart = new Date(booking.start_time);
                const bookingEnd = new Date(booking.end_time);

                return areIntervalsOverlapping(
                    { start: slotStart, end: slotEnd },
                    { start: bookingStart, end: bookingEnd }
                );
            });

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
