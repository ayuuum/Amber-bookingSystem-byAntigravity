/**
 * イベントハンドラー設定
 * 
 * 各イベントタイプに対するハンドラー設定を定義
 * SLA（目標完了時間、アラート閾値）、優先度、再試行設定を含む
 */

export interface HandlerConfig {
    name: string;
    type: 'sync' | 'async';
    priority: 'critical' | 'high' | 'medium' | 'low';
    sla: {
        targetCompletionMs: number; // 目標完了時間（ミリ秒）
        alertThresholdMs: number; // アラート閾値（ミリ秒）
    };
    retryConfig: {
        maxRetries: number;
        backoffMs: number;
        backoffMultiplier: number;
    };
}

export interface EventHandlerConfig {
    handlers: HandlerConfig[];
}

export interface EventHandlersConfigMap {
    [eventType: string]: EventHandlerConfig;
}

/**
 * イベントハンドラー設定
 */
export const EVENT_HANDLERS_CONFIG: EventHandlersConfigMap = {
    'booking.created': {
        handlers: [
            {
                name: 'sendLineNotification',
                type: 'async',
                priority: 'high',
                sla: {
                    targetCompletionMs: 5000, // 5秒以内に完了
                    alertThresholdMs: 10000, // 10秒超えたらアラート
                },
                retryConfig: {
                    maxRetries: 3,
                    backoffMs: 1000,
                    backoffMultiplier: 2,
                },
            },
            {
                name: 'syncGoogleCalendar',
                type: 'async',
                priority: 'medium',
                sla: {
                    targetCompletionMs: 8000, // 8秒以内に完了
                    alertThresholdMs: 15000, // 15秒超えたらアラート
                },
                retryConfig: {
                    maxRetries: 5,
                    backoffMs: 2000,
                    backoffMultiplier: 2,
                },
            },
            {
                name: 'saveBookingToDatabase',
                type: 'sync', // 予約作成時点で既に完了している
                priority: 'critical',
                sla: {
                    targetCompletionMs: 0,
                    alertThresholdMs: 0,
                },
                retryConfig: {
                    maxRetries: 0,
                    backoffMs: 0,
                    backoffMultiplier: 0,
                },
            },
        ],
    },
    'payment.completed': {
        handlers: [
            {
                name: 'sendLineNotification',
                type: 'async',
                priority: 'high',
                sla: {
                    targetCompletionMs: 5000,
                    alertThresholdMs: 10000,
                },
                retryConfig: {
                    maxRetries: 3,
                    backoffMs: 1000,
                    backoffMultiplier: 2,
                },
            },
            {
                name: 'syncGoogleCalendar',
                type: 'async',
                priority: 'medium',
                sla: {
                    targetCompletionMs: 8000,
                    alertThresholdMs: 15000,
                },
                retryConfig: {
                    maxRetries: 5,
                    backoffMs: 2000,
                    backoffMultiplier: 2,
                },
            },
        ],
    },
    'booking.status_changed': {
        handlers: [
            {
                name: 'sendStatusChangeNotification',
                type: 'async',
                priority: 'medium',
                sla: {
                    targetCompletionMs: 5000,
                    alertThresholdMs: 10000,
                },
                retryConfig: {
                    maxRetries: 3,
                    backoffMs: 1000,
                    backoffMultiplier: 2,
                },
            },
        ],
    },
    'booking.cancelled': {
        handlers: [
            {
                name: 'sendCancellationNotification',
                type: 'async',
                priority: 'high',
                sla: {
                    targetCompletionMs: 5000,
                    alertThresholdMs: 10000,
                },
                retryConfig: {
                    maxRetries: 3,
                    backoffMs: 1000,
                    backoffMultiplier: 2,
                },
            },
        ],
    },
};

/**
 * イベントタイプからハンドラー設定を取得
 */
export function getEventHandlerConfig(eventType: string): EventHandlerConfig | undefined {
    return EVENT_HANDLERS_CONFIG[eventType];
}

/**
 * ハンドラー名からハンドラー設定を取得
 */
export function getHandlerConfig(eventType: string, handlerName: string): HandlerConfig | undefined {
    const eventConfig = getEventHandlerConfig(eventType);
    if (!eventConfig) return undefined;
    
    return eventConfig.handlers.find(h => h.name === handlerName);
}


