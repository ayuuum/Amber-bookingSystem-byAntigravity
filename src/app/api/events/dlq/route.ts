/**
 * Deadletter Queue (DLQ) APIエンドポイント
 * 
 * DLQ内のイベント一覧取得、手動再処理機能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processEvent } from '@/lib/events/processor';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/middleware';
import { AmberErrors, errorResponse } from '@/lib/errors';

async function getHandler(request: NextRequest, context: any) {
    try {
        const { supabase } = context;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // DLQ内のイベントを取得
        const { data: events, error } = await supabase
            .from('system_events')
            .select('*')
            .eq('queue_name', 'dlq')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw error;
        }

        // DLQ内のイベント総数を取得
        const { count, error: countError } = await supabase
            .from('system_events')
            .select('*', { count: 'exact', head: true })
            .eq('queue_name', 'dlq');

        if (countError) {
            throw countError;
        }

        // エラータイプ別の集計
        const { data: errorTypeStats } = await supabase
            .from('system_events')
            .select('error_type')
            .eq('queue_name', 'dlq');

        const errorTypeCounts: Record<string, number> = {};
        errorTypeStats?.forEach(event => {
            const errorType = event.error_type || 'UNKNOWN';
            errorTypeCounts[errorType] = (errorTypeCounts[errorType] || 0) + 1;
        });

        return NextResponse.json({
            events: events || [],
            total: count || 0,
            errorTypeCounts,
        });
    } catch (error) {
        logger.error('Error fetching DLQ events', {
            error: error instanceof Error ? error.message : String(error),
        });

        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

async function postHandler(request: NextRequest, context: any) {
    try {
        const { supabase } = context;
        const body = await request.json();
        const { eventId, action } = body;

        if (!eventId) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('eventId is required'));
        }

        if (action === 'retry') {
            // DLQからmainキューに戻して再処理
            const { error: updateError } = await supabase
                .from('system_events')
                .update({
                    queue_name: 'main',
                    status: 'pending',
                    retry_count: 0,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', eventId);

            if (updateError) {
                throw updateError;
            }

            // イベントを処理
            const result = await processEvent(supabase, eventId);

            return NextResponse.json({
                success: result.success,
                eventId,
                error: result.error?.message,
            });
        } else if (action === 'delete') {
            // DLQからイベントを削除
            const { error: deleteError } = await supabase
                .from('system_events')
                .delete()
                .eq('id', eventId)
                .eq('queue_name', 'dlq');

            if (deleteError) {
                throw deleteError;
            }

            return NextResponse.json({
                success: true,
                message: 'Event deleted from DLQ',
            });
        } else {
            return errorResponse(AmberErrors.VALIDATION_ERROR('Invalid action'));
        }
    } catch (error) {
        logger.error('Error processing DLQ action', {
            error: error instanceof Error ? error.message : String(error),
        });

        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);


