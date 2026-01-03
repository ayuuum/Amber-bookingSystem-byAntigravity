/**
 * イベント発行ユーティリティ
 * 
 * イベントを system_events テーブルに発行する
 * 冪等性チェック（同じイベントの重複発行を防止）を含む
 */

import { logger } from '@/lib/logger';

export interface PublishEventOptions {
    eventType: string;
    entityType: string;
    entityId: string;
    payload: Record<string, any>;
    maxRetries?: number;
}

/**
 * イベントを発行
 * 
 * @param supabase Supabaseクライアント
 * @param options イベントオプション
 * @returns 発行されたイベントID
 */
export async function publishEvent(
    supabase: any,
    options: PublishEventOptions
): Promise<string | null> {
    const { eventType, entityType, entityId, payload, maxRetries = 3 } = options;

    try {
        // 冪等性チェック: 同じイベントが既に pending または processing 状態で存在するか確認
        const { data: existingEvent } = await supabase
            .from('system_events')
            .select('id')
            .eq('event_type', eventType)
            .eq('entity_id', entityId)
            .in('status', ['pending', 'processing'])
            .single();

        if (existingEvent) {
            logger.info('Event already exists, skipping duplicate publish', {
                eventType,
                entityType,
                entityId,
                existingEventId: existingEvent.id,
            });
            return existingEvent.id;
        }

        // イベントを発行
        const { data: event, error } = await supabase
            .from('system_events')
            .insert({
                event_type: eventType,
                entity_type: entityType,
                entity_id: entityId,
                payload: payload,
                status: 'pending',
                queue_name: 'main',
                max_retries: maxRetries,
            })
            .select('id')
            .single();

        if (error) {
            // 重複エラー（UNIQUE制約違反）の場合は既存のイベントIDを返す
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                logger.warn('Event insert failed due to duplicate, fetching existing event', {
                    eventType,
                    entityType,
                    entityId,
                    error: error.message,
                });

                const { data: existing } = await supabase
                    .from('system_events')
                    .select('id')
                    .eq('event_type', eventType)
                    .eq('entity_id', entityId)
                    .single();

                if (existing) {
                    return existing.id;
                }
            }

            logger.error('Failed to publish event', {
                eventType,
                entityType,
                entityId,
                error: error.message,
            });
            throw error;
        }

        logger.info('Event published successfully', {
            eventId: event.id,
            eventType,
            entityType,
            entityId,
        });

        return event.id;
    } catch (error) {
        logger.error('Error publishing event', {
            eventType,
            entityType,
            entityId,
            error: error instanceof Error ? error.message : String(error),
        });
        // イベント発行の失敗は予約作成を阻害しない（ログのみ記録）
        return null;
    }
}

/**
 * 複数のイベントを一括発行
 * 
 * @param supabase Supabaseクライアント
 * @param events イベントの配列
 * @returns 発行されたイベントIDの配列
 */
export async function publishEvents(
    supabase: any,
    events: PublishEventOptions[]
): Promise<(string | null)[]> {
    const results = await Promise.allSettled(
        events.map(event => publishEvent(supabase, event))
    );

    return results.map(result => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            logger.error('Failed to publish event in batch', {
                error: result.reason,
            });
            return null;
        }
    });
}


