/**
 * イベント処理Cronジョブ
 * 
 * Vercel Cronまたは外部Cronサービスから呼び出し
 * 定期的に未処理イベントを処理
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processPendingEvents } from '@/lib/events/processor';
import { logger } from '@/lib/logger';

// Cron secret を検証（環境変数から取得）
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
    // Cron secret を検証
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = await createClient();
        
        // 未処理イベントを処理（最大10件）
        const results = await processPendingEvents(supabase, 10);

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        logger.info('Cron: Event processing completed', {
            total: results.length,
            success: successCount,
            failure: failureCount,
        });

        return NextResponse.json({
            success: true,
            processed: results.length,
            successCount,
            failureCount,
        });
    } catch (error) {
        logger.error('Cron: Error processing events', {
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


