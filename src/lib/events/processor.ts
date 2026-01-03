/**
 * イベント処理ロジック
 * 
 * イベントを処理し、観察記録を記録、DLQへの移動を管理
 */

import { logger } from '@/lib/logger';
import { getEventHandlerConfig } from '@/lib/events/config';
import { handleBookingCreated, handleBookingCancelled } from './handlers/booking-handler';
import { isRetryableError } from './retry-policy';

export interface ProcessEventResult {
    success: boolean;
    eventId: string;
    handlerResults?: any;
    error?: Error;
}

/**
 * 単一イベントを処理
 * 
 * @param supabase Supabaseクライアント
 * @param eventId イベントID
 * @returns 処理結果
 */
export async function processEvent(
    supabase: any,
    eventId: string
): Promise<ProcessEventResult> {
    const startTime = Date.now();

    try {
        // イベントを取得
        const { data: event, error: fetchError } = await supabase
            .from('system_events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (fetchError || !event) {
            logger.error('Failed to fetch event', {
                eventId,
                error: fetchError?.message,
            });
            return {
                success: false,
                eventId,
                error: fetchError || new Error('Event not found'),
            };
        }

        // イベントを processing 状態に更新
        await supabase
            .from('system_events')
            .update({
                status: 'processing',
                updated_at: new Date().toISOString(),
            })
            .eq('id', eventId);

        // イベントタイプに応じたハンドラーを実行
        let handlerResults: any = null;

        switch (event.event_type) {
            case 'booking.created':
                handlerResults = await handleBookingCreated(supabase, event);
                break;
            case 'booking.cancelled':
                handlerResults = await handleBookingCancelled(supabase, event);
                break;
            case 'payment.completed':
                // payment.completed も booking.created と同じハンドラーを使用
                handlerResults = await handleBookingCreated(supabase, event);
                break;
            default:
                logger.warn('Unknown event type', {
                    eventType: event.event_type,
                    eventId,
                });
                handlerResults = { errors: [{ handler: 'unknown', error: 'Unknown event type' }] };
        }

        // 観察記録を記録
        const eventConfig = getEventHandlerConfig(event.event_type);
        if (eventConfig) {
            for (const handlerConfig of eventConfig.handlers) {
                if (handlerConfig.type === 'async') {
                    await recordEventObservation(supabase, {
                        eventId: event.id,
                        handlerName: handlerConfig.name,
                        status: handlerResults?.errors?.some((e: any) => e.handler === handlerConfig.name)
                            ? 'failed'
                            : 'completed',
                        duration: handlerConfig.name === 'sendLineNotification'
                            ? handlerResults?.lineDuration
                            : handlerConfig.name === 'syncGoogleCalendar'
                            ? handlerResults?.calendarDuration
                            : undefined,
                        externalLatencies: {
                            lineApi: handlerResults?.lineDuration,
                            googleApi: handlerResults?.calendarDuration,
                        },
                        retryCount: event.retry_count,
                        shouldRetry: handlerResults?.errors?.some((e: any) => {
                            if (e.handler === handlerConfig.name) {
                                return isRetryableError(new Error(e.error));
                            }
                            return false;
                        }),
                    });
                }
            }
        }

        // 処理結果に応じてイベント状態を更新
        const hasErrors = handlerResults?.errors && handlerResults.errors.length > 0;
        const allHandlersFailed = handlerResults?.errors?.length === eventConfig?.handlers.length;

        if (hasErrors && allHandlersFailed && event.retry_count >= event.max_retries) {
            // 最大再試行回数に達した場合、DLQへ移動
            await moveToDLQ(supabase, eventId, 'Max retries exceeded');
            
            return {
                success: false,
                eventId,
                handlerResults,
                error: new Error('All handlers failed and max retries exceeded'),
            };
        } else if (hasErrors) {
            // エラーがあるが再試行可能な場合
            await supabase
                .from('system_events')
                .update({
                    status: 'failed',
                    retry_count: event.retry_count + 1,
                    error_message: handlerResults.errors.map((e: any) => e.error).join('; '),
                    error_type: 'HANDLER_ERROR',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', eventId);
            
            return {
                success: false,
                eventId,
                handlerResults,
                error: new Error('Handlers failed but retryable'),
            };
        } else {
            // 成功
            await supabase
                .from('system_events')
                .update({
                    status: 'completed',
                    processed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', eventId);
            
            const totalDuration = Date.now() - startTime;
            logger.info('Event processed successfully', {
                eventId,
                eventType: event.event_type,
                totalDuration,
            });
            
            return {
                success: true,
                eventId,
                handlerResults,
            };
        }
    } catch (error) {
        const totalDuration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        logger.error('Error processing event', {
            eventId,
            error: errorMessage,
            duration: totalDuration,
        });

        // エラーを記録
        await supabase
            .from('system_events')
            .update({
                status: 'failed',
                retry_count: (await supabase.from('system_events').select('retry_count').eq('id', eventId).single()).data?.retry_count + 1 || 1,
                error_message: errorMessage,
                error_type: 'PROCESSOR_ERROR',
                updated_at: new Date().toISOString(),
            })
            .eq('id', eventId);

        return {
            success: false,
            eventId,
            error: error instanceof Error ? error : new Error(errorMessage),
        };
    }
}

/**
 * 未処理イベントを一括処理
 * 
 * @param supabase Supabaseクライアント
 * @param limit 処理するイベント数の上限
 * @returns 処理結果
 */
export async function processPendingEvents(
    supabase: any,
    limit: number = 10
): Promise<ProcessEventResult[]> {
    // 未処理イベントを取得（mainキュー、pending状態、作成日時順）
    const { data: events, error } = await supabase
        .from('system_events')
        .select('id')
        .eq('queue_name', 'main')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) {
        logger.error('Failed to fetch pending events', { error: error.message });
        return [];
    }

    if (!events || events.length === 0) {
        return [];
    }

    logger.info('Processing pending events', {
        count: events.length,
    });

    // 各イベントを処理
    const results = await Promise.allSettled(
        events.map(event => processEvent(supabase, event.id))
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            logger.error('Event processing failed', {
                eventId: events[index].id,
                error: result.reason,
            });
            return {
                success: false,
                eventId: events[index].id,
                error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
            };
        }
    });
}

/**
 * 失敗イベントをDLQへ移動
 * 
 * @param supabase Supabaseクライアント
 * @param eventId イベントID
 * @param reason 移動理由
 */
export async function moveToDLQ(
    supabase: any,
    eventId: string,
    reason: string
): Promise<void> {
    await supabase
        .from('system_events')
        .update({
            queue_name: 'dlq',
            status: 'failed',
            error_message: reason,
            updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

    logger.warn('Event moved to DLQ', {
        eventId,
        reason,
    });
}

/**
 * 観察結果を記録
 * 
 * @param supabase Supabaseクライアント
 * @param observation 観察データ
 */
export async function recordEventObservation(
    supabase: any,
    observation: {
        eventId: string;
        handlerName: string;
        status: 'completed' | 'failed';
        errorType?: string;
        failurePoint?: string;
        duration?: number;
        externalLatencies?: Record<string, number>;
        retryCount?: number;
        shouldRetry?: boolean;
        nextRetryAt?: Date;
        metadata?: Record<string, any>;
    }
): Promise<void> {
    try {
        await supabase.from('event_observations').insert({
            event_id: observation.eventId,
            handler_name: observation.handlerName,
            status: observation.status,
            error_type: observation.errorType,
            failure_point: observation.failurePoint,
            duration_ms: observation.duration,
            external_latencies: observation.externalLatencies || {},
            retry_count: observation.retryCount || 0,
            should_retry: observation.shouldRetry,
            next_retry_at: observation.nextRetryAt?.toISOString(),
            metadata: observation.metadata || {},
        });
    } catch (error) {
        // 観察記録の失敗は処理を阻害しない
        logger.error('Failed to record event observation', {
            eventId: observation.eventId,
            handlerName: observation.handlerName,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}


