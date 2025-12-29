import { google } from 'googleapis';
import { oauth2Client } from './oauth';

export async function syncBookingToGoogleCalendar(staff: any, booking: any) {
    if (!staff.google_refresh_token) {
        console.warn(`Staff ${staff.id} has no Google Refresh Token. Skipping sync.`);
        return;
    }

    try {
        oauth2Client.setCredentials({
            refresh_token: staff.google_refresh_token,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: `【Amber】${booking.booking_items?.[0]?.services?.title || '清掃予約'} - ${booking.customers?.full_name}様`,
            location: booking.customers?.address,
            description: `お客様: ${booking.customers?.full_name}様\n電話: ${booking.customers?.phone}\n備考: ${booking.notes || 'なし'}\n\nAmber Booking ID: ${booking.id}`,
            start: {
                dateTime: new Date(booking.start_time).toISOString(),
                timeZone: 'Asia/Tokyo',
            },
            end: {
                dateTime: new Date(booking.end_time).toISOString(),
                timeZone: 'Asia/Tokyo',
            },
        };

        if (booking.google_event_id) {
            // Update existing event
            await calendar.events.update({
                calendarId: staff.google_calendar_id || 'primary',
                eventId: booking.google_event_id,
                requestBody: event,
            });
        } else {
            // Create new event
            const res = await calendar.events.insert({
                calendarId: staff.google_calendar_id || 'primary',
                requestBody: event,
            });

            return res.data.id; // Return new event ID to save in Amber DB
        }
    } catch (error) {
        console.error('Google Calendar Sync Error:', error);
    }
}
