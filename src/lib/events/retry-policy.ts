/**
 * エラータイプ別再試行戦略
 * 
 * 外部サービス（LINE、Google Calendar）ごとのエラータイプと再試行戦略を定義
 * 各エラータイプに対して、再試行可能かどうか、最大再試行回数、バックオフ設定を指定
 */

export interface RetryPolicy {
    retryable: boolean;
    maxRetries?: number;
    backoffMs?: number;
    backoffMultiplier?: number;
    reason: string;
    httpStatus?: number; // HTTPステータスコード（該当する場合）
}

export interface ErrorRetryPolicyMap {
    [errorCode: string]: RetryPolicy;
}

/**
 * エラータイプ別再試行戦略の定義
 */
export const ERROR_RETRY_POLICY: ErrorRetryPolicyMap = {
    // Google API 固有
    GOOGLE_API_RATE_LIMIT: {
        retryable: true,
        maxRetries: 5,
        backoffMs: 2000,
        backoffMultiplier: 3,
        reason: 'API quota exceeded - exponential backoff',
        httpStatus: 429,
    },
    
    GOOGLE_API_SERVER_ERROR: {
        retryable: true,
        maxRetries: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
        reason: 'Transient server error',
        httpStatus: 500,
    },
    
    GOOGLE_API_BAD_GATEWAY: {
        retryable: true,
        maxRetries: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
        reason: 'Bad gateway - transient error',
        httpStatus: 502,
    },
    
    GOOGLE_API_SERVICE_UNAVAILABLE: {
        retryable: true,
        maxRetries: 3,
        backoffMs: 2000,
        backoffMultiplier: 2,
        reason: 'Service temporarily unavailable',
        httpStatus: 503,
    },
    
    GOOGLE_API_GATEWAY_TIMEOUT: {
        retryable: true,
        maxRetries: 3,
        backoffMs: 2000,
        backoffMultiplier: 2,
        reason: 'Gateway timeout',
        httpStatus: 504,
    },
    
    GOOGLE_API_AUTH_FAILED: {
        retryable: false,
        reason: 'Authentication token expired - requires manual refresh',
        httpStatus: 401,
    },
    
    GOOGLE_API_FORBIDDEN: {
        retryable: false,
        reason: 'Access forbidden - permission issue',
        httpStatus: 403,
    },
    
    GOOGLE_API_NOT_FOUND: {
        retryable: false,
        reason: 'Resource not found',
        httpStatus: 404,
    },
    
    // LINE API 固有
    LINE_API_TIMEOUT: {
        retryable: true,
        maxRetries: 3,
        backoffMs: 500,
        backoffMultiplier: 2,
        reason: 'LINE API latency spike',
    },
    
    LINE_API_RATE_LIMIT: {
        retryable: true,
        maxRetries: 5,
        backoffMs: 1000,
        backoffMultiplier: 2,
        reason: 'LINE API rate limit exceeded',
    },
    
    LINE_API_SERVER_ERROR: {
        retryable: true,
        maxRetries: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
        reason: 'LINE API server error',
    },
    
    LINE_API_INVALID_USER_ID: {
        retryable: false,
        reason: 'User not found - LINE ID may have been deleted',
    },
    
    LINE_API_AUTH_FAILED: {
        retryable: false,
        reason: 'LINE API authentication failed',
    },
    
    // ネットワーク共通
    NETWORK_TIMEOUT: {
        retryable: true,
        maxRetries: 4,
        backoffMs: 1000,
        backoffMultiplier: 2,
        reason: 'Network connectivity issue',
    },
    
    ECONNREFUSED: {
        retryable: true,
        maxRetries: 3,
        backoffMs: 2000,
        backoffMultiplier: 2,
        reason: 'Service temporarily unavailable',
    },
    
    ENOTFOUND: {
        retryable: true,
        maxRetries: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
        reason: 'DNS resolution failed',
    },
    
    ETIMEDOUT: {
        retryable: true,
        maxRetries: 4,
        backoffMs: 1000,
        backoffMultiplier: 2,
        reason: 'Connection timeout',
    },
};

/**
 * エラーから再試行戦略を取得
 */
export function getRetryPolicy(error: Error | any): RetryPolicy {
    // HTTPステータスコードから判定（Google API）
    if (error?.response?.status) {
        const httpStatus = error.response.status;
        const policyKey = Object.keys(ERROR_RETRY_POLICY).find(
            key => ERROR_RETRY_POLICY[key].httpStatus === httpStatus
        );
        if (policyKey) {
            return ERROR_RETRY_POLICY[policyKey];
        }
    }
    
    // エラーコードから判定
    if (error?.code) {
        const errorCode = error.code.toUpperCase();
        if (ERROR_RETRY_POLICY[errorCode]) {
            return ERROR_RETRY_POLICY[errorCode];
        }
    }
    
    // エラーメッセージから判定
    if (error?.message) {
        const message = error.message.toLowerCase();
        
        // LINE API エラー
        if (message.includes('line') && message.includes('timeout')) {
            return ERROR_RETRY_POLICY.LINE_API_TIMEOUT;
        }
        if (message.includes('line') && message.includes('rate limit')) {
            return ERROR_RETRY_POLICY.LINE_API_RATE_LIMIT;
        }
        if (message.includes('line') && message.includes('invalid user')) {
            return ERROR_RETRY_POLICY.LINE_API_INVALID_USER_ID;
        }
        
        // ネットワークエラー
        if (message.includes('timeout') || message.includes('timed out')) {
            return ERROR_RETRY_POLICY.NETWORK_TIMEOUT;
        }
        if (message.includes('econnrefused')) {
            return ERROR_RETRY_POLICY.ECONNREFUSED;
        }
        if (message.includes('enotfound')) {
            return ERROR_RETRY_POLICY.ENOTFOUND;
        }
        if (message.includes('etimedout')) {
            return ERROR_RETRY_POLICY.ETIMEDOUT;
        }
    }
    
    // デフォルト: 再試行しない
    return {
        retryable: false,
        reason: 'Unknown error - no retry policy found',
    };
}

/**
 * エラーが再試行可能かどうかを判定
 */
export function isRetryableError(error: Error | any): boolean {
    const policy = getRetryPolicy(error);
    return policy.retryable;
}

