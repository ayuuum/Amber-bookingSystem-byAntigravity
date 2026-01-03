/**
 * イベント処理APIエンドポイント
 * 
 * 未処理イベントを取得して処理
 * Cronジョブまたは手動トリガーで実行
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processPendingEvents } from '@/lib/events/processor';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const limit = body.limit || 10;

        // 未処理イベントを処理
        const results = await processPendingEvents(supabase, limit);

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        logger.info('Event processing completed', {
            total: results.length,
            success: successCount,
            failure: failureCount,
        });

        return NextResponse.json({
            success: true,
            processed: results.length,
            successCount,
            failureCount,
            results: results.map(r => ({
                eventId: r.eventId,
                success: r.success,
                error: r.error?.message,
            })),
        });
    } catch (error) {
        logger.error('Error processing events', {
            error: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET: 未処理イベントの統計情報を取得
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const queueName = searchParams.get('queue') || 'main';

        // 未処理イベント数を取得
        const { count: pendingCount, error: pendingError } = await supabase
            .from('system_events')
            .select('*', { count: 'exact', head: true })
            .eq('queue_name', queueName)
            .eq('status', 'pending');

        if (pendingError) {
            throw pendingError;
        }

        // 処理中イベント数を取得
        const { count: processingCount, error: processingError } = await supabase
            .from('system_events')
            .select('*', { count: 'exact', head: true })
            .eq('queue_name', queueName)
            .eq('status', 'processing');

        if (processingError) {
            throw processingError;
        }

        // 失敗イベント数を取得
        const { count: failedCount, error: failedError } = await supabase
            .from('system_events')
            .select('*', { count: 'exact', head: true })
            .eq('queue_name', queueName)
            .eq('status', 'failed');

        if (failedError) {
            throw failedError;
        }

        return NextResponse.json({
            queue: queueName,
            pending: pendingCount || 0,
            processing: processingCount || 0,
            failed: failedCount || 0,
        });
    } catch (error) {
        logger.error('Error fetching event statistics', {
            error: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}


