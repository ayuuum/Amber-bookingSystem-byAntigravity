/**
 * 予約イベントハンドラー
 * 
 * 予約作成、更新、キャンセルなどのイベントを処理
 * 観察記録を記録しながら、LINE通知、Google Calendar同期を実行
 */

import { sendBookingConfirmationLine, sendBookingCancelledLine } from '@/lib/line/notifications';
import { syncBookingToGoogleCalendar } from '@/lib/google/sync';
import { getPlanAccess } from '@/lib/plan/access';
import { getHandlerConfig } from '@/lib/events/config';
import { logger } from '@/lib/logger';

export interface BookingEventHandlerResult {
    lineSuccess: boolean;
    calendarSuccess: boolean;
    lineDuration?: number;
    calendarDuration?: number;
    errors: Array<{ handler: string; error: string }>;
}

/**
 * 予約作成イベントを処理
 * 
 * @param supabase Supabaseクライアント
 * @param event イベントデータ
 * @returns 処理結果
 */
export async function handleBookingCreated(
    supabase: any,
    event: { payload: any }
): Promise<BookingEventHandlerResult> {
    const { booking, planAccess } = event.payload;
    const result: BookingEventHandlerResult = {
        lineSuccess: false,
        calendarSuccess: false,
        errors: [],
    };

    const handlerConfig = getHandlerConfig('booking.created', 'sendLineNotification');
    const startTime = Date.now();

    // LINE通知送信
    if (booking?.customers?.line_user_id && planAccess?.canUseLine) {
        const lineStartTime = Date.now();
        try {
            await sendBookingConfirmationLine(booking.customers.line_user_id, booking);
            result.lineSuccess = true;
            result.lineDuration = Date.now() - lineStartTime;
            
            logger.info('LINE notification sent successfully', {
                bookingId: booking.id,
                lineUserId: booking.customers.line_user_id,
                duration: result.lineDuration,
            });
        } catch (error) {
            const duration = Date.now() - lineStartTime;
            result.lineDuration = duration;
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push({
                handler: 'sendLineNotification',
                error: errorMessage,
            });
            
            logger.error('LINE notification failed', {
                bookingId: booking.id,
                lineUserId: booking.customers.line_user_id,
                error: errorMessage,
                duration,
            });
        }
    }

    // Google Calendar同期
    if (booking?.staff_id && planAccess?.canUseGoogleCalendar) {
        const calendarStartTime = Date.now();
        try {
            const { data: staff } = await supabase
                .from('staff')
                .select('*')
                .eq('id', booking.staff_id)
                .single();

            if (staff?.google_refresh_token) {
                const googleEventId = await syncBookingToGoogleCalendar(staff, booking);
                if (googleEventId) {
                    // Google CalendarイベントIDを予約に保存
                    await supabase
                        .from('bookings')
                        .update({ google_event_id: googleEventId })
                        .eq('id', booking.id);
                    
                    result.calendarSuccess = true;
                    result.calendarDuration = Date.now() - calendarStartTime;
                    
                    logger.info('Google Calendar sync successful', {
                        bookingId: booking.id,
                        staffId: booking.staff_id,
                        googleEventId,
                        duration: result.calendarDuration,
                    });
                } else {
                    result.calendarDuration = Date.now() - calendarStartTime;
                    result.errors.push({
                        handler: 'syncGoogleCalendar',
                        error: 'Google Calendar sync returned no event ID',
                    });
                }
            } else {
                result.calendarDuration = Date.now() - calendarStartTime;
                logger.warn('Google Calendar sync skipped - no refresh token', {
                    bookingId: booking.id,
                    staffId: booking.staff_id,
                });
            }
        } catch (error) {
            const duration = Date.now() - calendarStartTime;
            result.calendarDuration = duration;
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push({
                handler: 'syncGoogleCalendar',
                error: errorMessage,
            });
            
            logger.error('Google Calendar sync failed', {
                bookingId: booking.id,
                staffId: booking.staff_id,
                error: errorMessage,
                duration,
            });
        }
    }

    const totalDuration = Date.now() - startTime;
    logger.info('Booking created event handled', {
        bookingId: booking.id,
        lineSuccess: result.lineSuccess,
        calendarSuccess: result.calendarSuccess,
        totalDuration,
        errors: result.errors.length,
    });

    return result;
}

/**
 * 予約キャンセルイベントを処理
 * 
 * @param supabase Supabaseクライアント
 * @param event イベントデータ
 * @returns 処理結果
 */
export async function handleBookingCancelled(
    supabase: any,
    event: { payload: any }
): Promise<BookingEventHandlerResult> {
    const { booking, refundAmount, feePercent, planAccess } = event.payload;
    const result: BookingEventHandlerResult = {
        lineSuccess: false,
        calendarSuccess: false,
        errors: [],
    };

    // LINE通知送信
    if (booking?.customers?.line_user_id && planAccess?.canUseLine) {
        const lineStartTime = Date.now();
        try {
            await sendBookingCancelledLine(
                booking.customers.line_user_id,
                booking,
                refundAmount,
                feePercent
            );
            result.lineSuccess = true;
            result.lineDuration = Date.now() - lineStartTime;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push({
                handler: 'sendCancellationNotification',
                error: errorMessage,
            });
        }
    }

    return result;
}


