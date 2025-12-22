import { createClient } from '@/lib/supabase/server';
import { lineClient } from '@/lib/line/client';
import { NextResponse } from 'next/server';

/**
 * Webhook for Missed Calls (Scenario 3)
 * 
 * In a real-world scenario, this would be called by a telephony service (Twilio, etc.)
 * when a call is not answered.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { from_number } = body; // The customer's phone number

        if (!from_number) {
            return NextResponse.json({ error: 'Missing from_number' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Find customer by phone number
        const { data: customer } = await supabase
            .from('customers')
            .select('*, stores(slug, name)')
            .eq('phone', from_number)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (customer && customer.line_user_id) {
            // 2. Automated LINE Response
            const storeName = customer.stores?.name || 'ナガレボシ';
            const storeSlug = customer.stores?.slug || 'nagareboshi';
            const bookingUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${storeSlug}`;

            const text = `お電話ありがとうございます。${storeName}です。ただいま電話に出ることができません。こちらのURLより24時間オンライン予約が可能です。\n\n${bookingUrl}`;

            await lineClient.pushMessage({
                to: customer.line_user_id,
                messages: [{ type: 'text', text }]
            });

            return NextResponse.json({ success: true, channel: 'LINE', customerId: customer.id });
        }

        // 3. Fallback: SMS (Not implemented in this prototype, but documented for Scenario 3)
        console.log(`[Missed Call] No LINE account found for ${from_number}. Should send SMS.`);

        return NextResponse.json({
            success: true,
            channel: 'SMS_FALLBACK',
            message: 'LINE not linked, SMS logic would go here in production.'
        });

    } catch (error: any) {
        console.error('Missed Call Webhook Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
