/**
 * Amber Error Code System
 * 
 * Standardized error codes for API responses as defined in PRD Section 17.
 * All API endpoints should use these codes for consistent error handling.
 */

// Error code type definition
export interface AmberError {
    code: string;
    message: string;
    httpStatus: number;
    details?: Record<string, unknown>;
}

// Error constructors organized by category
export const AmberErrors = {
    // Authentication & Authorization (ERR_AUTH_xxx)
    AUTH_TOKEN_EXPIRED: (): AmberError => ({
        code: 'ERR_AUTH_001',
        message: '認証トークンが期限切れです。再ログインしてください。',
        httpStatus: 401,
    }),

    UNAUTHORIZED: (): AmberError => ({
        code: 'ERR_AUTH_001',
        message: 'ログインが必要です。',
        httpStatus: 401,
    }),

    FORBIDDEN: (): AmberError => ({
        code: 'ERR_AUTH_002',
        message: 'この操作を行う権限がありません。',
        httpStatus: 403,
    }),

    AUTH_INSUFFICIENT_PERMISSION: (action?: string): AmberError => ({
        code: 'ERR_AUTH_002',
        message: action
            ? `この操作を行う権限がありません: ${action}`
            : 'この操作を行う権限がありません。',
        httpStatus: 403,
    }),

    AUTH_ORG_ACCESS_DENIED: (): AmberError => ({
        code: 'ERR_AUTH_003',
        message: '他の組織のデータにはアクセスできません。',
        httpStatus: 403,
    }),

    // Booking Errors (ERR_BOOK_xxx)
    BOOK_SLOT_TAKEN: (time?: string): AmberError => ({
        code: 'ERR_BOOK_001',
        message: time
            ? `選択された時間枠（${time}）は既に予約されています。`
            : '選択された時間枠は既に予約されています。',
        httpStatus: 409,
    }),

    BOOK_PAYMENT_TIMEOUT: (): AmberError => ({
        code: 'ERR_BOOK_002',
        message: '決済の有効期限が切れました。もう一度予約をやり直してください。',
        httpStatus: 410,
    }),

    BOOK_STAFF_UNAVAILABLE: (date?: string): AmberError => ({
        code: 'ERR_BOOK_003',
        message: date
            ? `指定日（${date}）はスタッフが対応できません。`
            : 'スタッフが対応できない日程です。',
        httpStatus: 400,
    }),

    BOOK_SERVICE_INACTIVE: (serviceName?: string): AmberError => ({
        code: 'ERR_BOOK_004',
        message: serviceName
            ? `サービス「${serviceName}」は現在利用できません。`
            : 'このサービスは現在利用できません。',
        httpStatus: 400,
    }),

    BOOK_CANCEL_DEADLINE_PASSED: (): AmberError => ({
        code: 'ERR_BOOK_005',
        message: 'キャンセル期限を過ぎているため、キャンセルできません。',
        httpStatus: 400,
    }),

    // Payment Errors (ERR_PAY_xxx)
    PAY_PROCESSING_FAILED: (stripeError?: string): AmberError => ({
        code: 'ERR_PAY_001',
        message: '決済処理に失敗しました。別のお支払い方法をお試しください。',
        httpStatus: 402,
        details: stripeError ? { stripeError } : undefined,
    }),

    PAY_REFUND_FAILED: (): AmberError => ({
        code: 'ERR_PAY_002',
        message: '返金処理に失敗しました。サポートにお問い合わせください。',
        httpStatus: 500,
    }),

    PAY_FEE_MISMATCH: (): AmberError => ({
        code: 'ERR_PAY_003',
        message: '手数料計算に不整合が発生しました。',
        httpStatus: 500,
    }),

    // Plan & Limit Errors (ERR_PLAN_xxx)
    PLAN_STORE_LIMIT: (current: number, max: number): AmberError => ({
        code: 'ERR_PLAN_001',
        message: `店舗数が上限（${max}店舗）に達しています。プランをアップグレードしてください。`,
        httpStatus: 402,
        details: { current, max },
    }),

    PLAN_STAFF_LIMIT: (current: number, max: number): AmberError => ({
        code: 'ERR_PLAN_002',
        message: `スタッフ数が上限（${max}名）に達しています。プランをアップグレードしてください。`,
        httpStatus: 402,
        details: { current, max },
    }),

    PLAN_ASSET_LIMIT: (current: number, max: number): AmberError => ({
        code: 'ERR_PLAN_003',
        message: `家カルテ登録数が上限（${max}件）に達しています。`,
        httpStatus: 402,
        details: { current, max },
    }),

    PLAN_FEATURE_UNAVAILABLE: (feature: string): AmberError => ({
        code: 'ERR_PLAN_004',
        message: `「${feature}」機能を利用するにはプランのアップグレードが必要です。`,
        httpStatus: 402,
        details: { feature },
    }),

    // General Errors
    NOT_FOUND: (resource: string): AmberError => ({
        code: 'ERR_NOT_FOUND',
        message: `${resource}が見つかりません。`,
        httpStatus: 404,
    }),

    VALIDATION_ERROR: (message: string): AmberError => ({
        code: 'ERR_VALIDATION',
        message,
        httpStatus: 400,
    }),

    DATABASE_ERROR: (message?: string): AmberError => ({
        code: 'ERR_DB',
        message: message || 'データベースエラーが発生しました。',
        httpStatus: 500,
    }),

    INTERNAL_ERROR: (): AmberError => ({
        code: 'ERR_INTERNAL',
        message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください。',
        httpStatus: 500,
    }),
};

// Helper to create NextResponse from AmberError
import { NextResponse } from 'next/server';

export function errorResponse(error: AmberError): NextResponse {
    return NextResponse.json(
        {
            error: {
                code: error.code,
                message: error.message,
                ...(error.details && { details: error.details }),
            },
        },
        { status: error.httpStatus }
    );
}

// Type guard to check if something is an AmberError
export function isAmberError(obj: unknown): obj is AmberError {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'code' in obj &&
        'message' in obj &&
        'httpStatus' in obj
    );
}
