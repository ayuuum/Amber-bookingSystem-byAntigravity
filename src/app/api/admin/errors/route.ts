/**
 * Error Logs API
 * 
 * GET /api/admin/errors - 直近の予約失敗ログを取得
 * 
 * PRD Reference: Section 10-2 (ADM-011)
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';

async function handler(request: NextRequest, context: any) {
    console.log('[ADMIN ERRORS] start');
    try {
        const { supabase, user } = context;
        console.log('[ADMIN ERRORS] user:', user?.id);

        // ユーザーの組織IDを取得
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        console.log('[ADMIN ERRORS] profile:', profile);
        console.log('[ADMIN ERRORS] profileError:', profileError);

        if (profileError || !profile?.organization_id) {
            console.error('[ADMIN ERRORS] profile/organization missing or error');
            return NextResponse.json(
                { error: profileError?.message ?? 'Organization not found', raw: profileError },
                { status: 403 }
            );
        }

        // 直近30日間のエラーログを取得
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: errorLogs, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .eq('operation_type', 'booking.failed')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(100);

        console.log('[ADMIN ERRORS] data:', errorLogs ? `${errorLogs.length} logs found` : 'null');
        console.log('[ADMIN ERRORS] error:', error);

        // audit_logsテーブルが存在しない場合は正常な空状態として扱う（未実装機能）
        if (error) {
            const errorMessage = error.message || '';
            if (errorMessage.includes('Could not find the table') || errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
                // テーブル未存在は正常な状態として扱う（未実装機能）
                // console.errorは出さない
                return NextResponse.json({
                    logs: [],
                    count: 0,
                });
            }
            // その他のエラーは致命的なエラーとして扱う
            console.error('[ADMIN ERRORS] Supabase error:', error);
            return NextResponse.json(
                { error: error.message ?? 'Unknown database error', raw: error },
                { status: 500 }
            );
        }

        // エラーコードから表示メッセージに変換
        const errorMessages: Record<string, string> = {
            'ERR_BOOK_001': '選択された日時は既に予約済みです',
            'ERR_BOOK_002': '決済の有効期限が切れました',
            'ERR_PAY_001': '決済処理に失敗しました',
            'ERR_PLAN_001': '店舗数の上限に達しています',
        };

        const formattedLogs = (errorLogs || []).map((log: any) => {
            const errorCode = log.metadata?.errorCode || 'UNKNOWN';
            return {
                id: log.id,
                createdAt: log.created_at,
                errorCode,
                errorMessage: errorMessages[errorCode] || '不明なエラー',
                bookingId: log.entity_id,
                metadata: log.metadata,
            };
        });

        return NextResponse.json({
            logs: formattedLogs,
            count: formattedLogs.length,
        });
    } catch (error: any) {
        console.error('[ADMIN ERRORS] Unexpected error:', error);
        return NextResponse.json(
            { error: error.message ?? 'Internal server error', raw: error },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handler);

