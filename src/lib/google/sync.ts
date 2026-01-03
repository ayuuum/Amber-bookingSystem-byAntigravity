import { google } from 'googleapis';
import { oauth2Client } from './oauth';
import { retryWithBackoff } from '@/lib/utils/retry';
import { logger } from '@/lib/logger';

export async function syncBookingToGoogleCalendar(staff: any, booking: any): Promise<string | undefined> {
    if (!staff.google_refresh_token) {
        logger.warn('Google Calendar sync skipped - no refresh token', {
            staffId: staff.id,
            bookingId: booking.id,
        });
        return;
    }

    const result = await retryWithBackoff(
        async () => {
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
                return booking.google_event_id;
            } else {
                // Create new event
                const res = await calendar.events.insert({
                    calendarId: staff.google_calendar_id || 'primary',
                    requestBody: event,
                });

                return res.data.id; // Return new event ID to save in Amber DB
            }
        },
        {
            onRetry: (attempt, error) => {
                logger.warn('Google Calendar sync retry', {
                    attempt,
                    error: error.message,
                    bookingId: booking.id,
                    staffId: staff.id,
                    httpStatus: (error as any)?.response?.status,
                });
            },
        }
    );

    if (!result.success) {
        logger.error('Google Calendar sync failed after retries', {
            error: result.error?.message,
            attempts: result.attempts,
            totalDuration: result.totalDuration,
            bookingId: booking.id,
            staffId: staff.id,
            httpStatus: (result.error as any)?.response?.status,
        });
        // エラーを投げずにundefinedを返す（予約作成を阻害しない）
        return undefined;
    }

    return result.data;
}
