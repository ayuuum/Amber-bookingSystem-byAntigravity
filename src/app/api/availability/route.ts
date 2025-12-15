import { createClient } from '@/lib/supabase/server';
import { oauth2Client } from '@/lib/google/oauth';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { addMinutes, format, parse, isBefore, startOfDay, endOfDay } from 'date-fns';

export async function POST(request: Request) {
    try {
        const { date, serviceId } = await request.json(); // date: '2024-12-25', serviceId: 'ac'
        const supabase = await createClient();

        // 1. Get Store & Credentials
        const { data: store } = await supabase
            .from('stores')
            .select('id, google_refresh_token')
            .limit(1)
            .single();

        if (!store || !store.google_refresh_token) {
            // If not connected, fallback to "All Open" (or fail? Phase 0 behavior was open)
            // For Phase 1, fail safely or return all slots?
            // Let's return defaults but warn.
            console.warn('Google Calendar not connected. Returning default slots.');
            return NextResponse.json(generateDefaultSlots());
        }

        // 2. Setup Google Client
        // Create a new client instance to avoid race conditions with singleton
        const { google } = await import('googleapis');
        const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BASE_URL } = await import('@/lib/google/oauth');

        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            `${BASE_URL}/api/auth/google/callback`
        );
        oauth2Client.setCredentials({ refresh_token: store.google_refresh_token });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 3. Get Service Duration
        const { data: service } = await supabase
            .from('services')
            .select('duration_minutes')
            .eq('id', serviceId)
            .single();

        const duration = service?.duration_minutes || 60; // default 60

        // 4. Get All Active Staff
        const { data: staffList } = await supabase
            .from('staff')
            .select('id, google_calendar_id')
            .eq('is_active', true)
            .eq('store_id', store.id);

        if (!staffList || staffList.length === 0) {
            return NextResponse.json([]);
        }

        // 5. Calculate Time Range (09:00 - 18:00)
        // Hardcoded business hours for MVP
        const targetDate = new Date(date);
        const timeMin = new Date(targetDate); timeMin.setHours(9, 0, 0, 0);
        const timeMax = new Date(targetDate); timeMax.setHours(18, 0, 0, 0);

        // 6. Check Availability for EACH Staff
        // A slot is available if AT LEAST ONE staff is free.
        // We will collect "Busy Ranges" for each staff.

        const staffBusyRanges: Record<string, { start: Date, end: Date }[]> = {};

        for (const staff of staffList) {
            staffBusyRanges[staff.id] = [];

            // A. Fetch GCal Events
            if (staff.google_calendar_id) {
                try {
                    const res = await calendar.events.list({
                        calendarId: staff.google_calendar_id, // e.g. 'primary' or specific ID
                        timeMin: timeMin.toISOString(),
                        timeMax: timeMax.toISOString(),
                        singleEvents: true,
                    });
                    const events = res.data.items || [];
                    events.forEach(event => {
                        if (event.start?.dateTime && event.end?.dateTime) {
                            staffBusyRanges[staff.id].push({
                                start: new Date(event.start.dateTime),
                                end: new Date(event.end.dateTime)
                            });
                        }
                    });
                } catch (e) {
                    console.error(`Failed to fetch GCal for staff ${staff.id}`, e);
                    // Treat as full busy? Or ignore? Ignore for now to not block others.
                }
            }

            // B. Fetch Internal Bookings (Double check)
            // DB Bookings should be synced to GCal, but fetching DB is safer for "Just Booked" items
            const { data: internalBookings } = await supabase
                .from('bookings')
                .select('start_time, end_time')
                .eq('staff_id', staff.id)
                .gte('start_time', timeMin.toISOString())
                .lte('end_time', timeMax.toISOString())
                .neq('status', 'cancelled');

            internalBookings?.forEach(b => {
                staffBusyRanges[staff.id].push({
                    start: new Date(b.start_time),
                    end: new Date(b.end_time)
                });
            });
        }

        // 7. Generate Slots and Check Against Staff
        const availableSlots: string[] = [];
        const slotsToCheck = generateDefaultSlots(); // ["09:00", ... "17:00"] assuming hourly

        for (const timeStr of slotsToCheck) {
            // "09:00" -> Date object
            const slotStart = parse(timeStr, 'HH:mm', targetDate);
            const slotEnd = addMinutes(slotStart, duration);

            // Check if ANY staff is free during [slotStart, slotEnd]
            let isSlotAvailable = false;

            for (const staff of staffList) {
                const busy = staffBusyRanges[staff.id];
                const isStaffFree = !busy.some(range => {
                    // Overlap check
                    return (slotStart < range.end && slotEnd > range.start);
                });

                if (isStaffFree) {
                    isSlotAvailable = true;
                    break; // Found one!
                }
            }

            if (isSlotAvailable) {
                availableSlots.push(timeStr);
            }
        }

        return NextResponse.json(availableSlots);

    } catch (error: any) {
        console.error('Availability API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function generateDefaultSlots() {
    return ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
}
