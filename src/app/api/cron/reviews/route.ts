import { createClient } from '@/lib/supabase/server';
import { lineClient } from '@/lib/line/client';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 1. Fetch completed bookings that haven't sent review requests
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, customers(*)')
        .eq('status', 'done')
        .is('review_sent_at', null)
        .limit(10); // Process in batches

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!bookings || bookings.length === 0) return NextResponse.json({ message: 'No bookings to process' });

    const results = [];

    for (const booking of bookings) {
        if (booking.customers?.line_user_id) {
            const reviewUrl = `${APP_URL}/reviews/${booking.id}`;
            const message = `本日は Amber のサービスをご利用いただきありがとうございました ✨
            
より良いサービス提供のため、ぜひ簡単なアンケートへのご協力をお願いいたします。
（1分程度で完了します）

👇レビューを投稿する
${reviewUrl}

またのご利用をお待ちしております！`;

            try {
                await lineClient.pushMessage({
                    to: booking.customers.line_user_id,
                    messages: [{ type: 'text', text: message }],
                });

                // Update flag
                await supabase
                    .from('bookings')
                    .update({ review_sent_at: new Date().toISOString() })
                    .eq('id', booking.id);

                results.push({ id: booking.id, status: 'sent' });
            } catch (err: any) {
                console.error(`Failed to send review request for ${booking.id}:`, err.message);
                results.push({ id: booking.id, status: 'failed', error: err.message });
            }
        }
    }

    return NextResponse.json({ processed: results.length, results });
}
