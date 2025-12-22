import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/client'; // Use client or server? Server for API.
import { createClient as createServerSupabase } from '@/lib/supabase/server';

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('x-line-signature');

    if (!CHANNEL_SECRET || !signature) {
        return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    // Verify Signature
    const hash = crypto
        .createHmac('sha256', CHANNEL_SECRET)
        .update(body)
        .digest('base64');

    if (hash !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const eventData = JSON.parse(body);
    const events = eventData.events || [];
    const supabase = await createServerSupabase();

    for (const event of events) {
        if (event.type === 'follow') {
            const userId = event.source.userId;
            // 1. Get User Profile from LINE
            const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
                headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` }
            });
            const profile = await profileRes.json();
            const displayName = profile.displayName || 'LINE User';

            // 2. Upsert Customer
            // Check if exists
            const { data: existing } = await supabase.from('customers').select('id').eq('line_user_id', userId).single();

            if (!existing) {
                // Get Store ID (MVP: First store)
                const { data: store } = await supabase.from('stores').select('id').limit(1).single();

                if (store) {
                    await supabase.from('customers').insert({
                        store_id: store.id,
                        line_user_id: userId,
                        name: displayName,
                        phone: 'LINE_Linked', // Placeholder until real booking
                        address: null
                    });
                }
            }

            // 3. Send Greeting Reply
            if (event.replyToken) {
                await fetch('https://api.line.me/v2/bot/message/reply', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
                    },
                    body: JSON.stringify({
                        replyToken: event.replyToken,
                        messages: [{
                            type: 'text',
                            text: '友だち追加ありがとうございます！\nご予約はこちらから可能です。'
                        }]
                    })
                });
            }
        }
    }

    return NextResponse.json({ status: 'ok' });
}
