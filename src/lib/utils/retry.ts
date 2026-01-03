/**
 * 再試行ユーティリティ関数
 * 
 * 指数バックオフによる再試行ロジックを提供
 * ERROR_RETRY_POLICY からエラータイプに応じた戦略を取得
 */

import { getRetryPolicy, RetryPolicy } from '@/lib/events/retry-policy';
import { logger } from '@/lib/logger';

export interface RetryOptions {
    maxRetries?: number;
    backoffMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
}

/**
 * 指数バックオフによる再試行
 * 
 * @param fn 実行する関数
 * @param options 再試行オプション（ERROR_RETRY_POLICYから取得した設定で上書き可能）
 * @returns 実行結果
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;
    
    // デフォルト設定
    const defaultMaxRetries = options.maxRetries ?? 3;
    const defaultBackoffMs = options.backoffMs ?? 1000;
    const defaultBackoffMultiplier = options.backoffMultiplier ?? 2;
    
    while (attempts < defaultMaxRetries) {
        attempts++;
        
        try {
            const result = await fn();
            const totalDuration = Date.now() - startTime;
            
            if (attempts > 1) {
                logger.info('Retry succeeded', {
                    attempts,
                    totalDuration,
                    lastError: lastError?.message,
                });
            }
            
            return {
                success: true,
                data: result,
                attempts,
                totalDuration,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // エラーから再試行戦略を取得
            const policy = getRetryPolicy(error);
            
            // 再試行不可能なエラーの場合、即座に失敗を返す
            if (!policy.retryable) {
                const totalDuration = Date.now() - startTime;
                logger.warn('Non-retryable error encountered', {
                    error: lastError.message,
                    errorCode: (error as any)?.code,
                    reason: policy.reason,
                    attempts,
                });
                
                return {
                    success: false,
                    error: lastError,
                    attempts,
                    totalDuration,
                };
            }
            
            // 最大再試行回数に達した場合
            if (attempts >= (policy.maxRetries ?? defaultMaxRetries)) {
                const totalDuration = Date.now() - startTime;
                logger.error('Max retries exceeded', {
                    error: lastError.message,
                    attempts,
                    totalDuration,
                    reason: policy.reason,
                });
                
                return {
                    success: false,
                    error: lastError,
                    attempts,
                    totalDuration,
                };
            }
            
            // 再試行前のコールバック
            if (options.onRetry) {
                options.onRetry(attempts, lastError);
            }
            
            // バックオフ時間を計算（ポリシーから取得、なければデフォルト）
            const backoffMs = policy.backoffMs ?? defaultBackoffMs;
            const backoffMultiplier = policy.backoffMultiplier ?? defaultBackoffMultiplier;
            const delay = backoffMs * Math.pow(backoffMultiplier, attempts - 1);
            
            // 最大遅延時間を10秒に制限
            const maxDelay = 10000;
            const actualDelay = Math.min(delay, maxDelay);
            
            logger.info('Retrying after backoff', {
                attempt: attempts,
                delay: actualDelay,
                error: lastError.message,
                reason: policy.reason,
            });
            
            // バックオフ待機
            await new Promise(resolve => setTimeout(resolve, actualDelay));
        }
    }
    
    // ここに到達することはないはずだが、念のため
    const totalDuration = Date.now() - startTime;
    return {
        success: false,
        error: lastError ?? new Error('Unknown error'),
        attempts,
        totalDuration,
    };
}

/**
 * シンプルな再試行関数（エラータイプ判定なし）
 * 
 * @param fn 実行する関数
 * @param maxRetries 最大再試行回数
 * @param delayMs 再試行間隔（ミリ秒）
 */
export async function retrySimple<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    
    throw lastError ?? new Error('Unknown error');
}


