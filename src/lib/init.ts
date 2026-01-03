/**
 * Application Initialization
 * 
 * Validates environment variables at startup.
 * This should be imported early in the application lifecycle.
 */

import { validateEnv } from './env';
import { logger } from './logger';

// Validate environment variables on module load (server-side only)
// Edge Runtime互換: process.exitは使用せず、エラーをログに記録するだけ
if (typeof window === 'undefined') {
    try {
        validateEnv();
        logger.info('Environment variables validated successfully');
    } catch (error) {
        // Error is already logged in validateEnv
        // Edge Runtimeではprocess.exitが使えないため、エラーをログに記録するだけ
        logger.error('Environment validation failed', { error });
        
        // Edge Runtimeではprocess.exitを使用できないため、エラーをthrowしない
        // middlewareが実行できなくなるのを防ぐため、エラーをログに記録するだけ
        // 後続の処理で環境変数が未検証であることを検出できるようにする
    }
}


