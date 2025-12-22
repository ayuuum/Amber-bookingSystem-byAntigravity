import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { sendBookingConfirmationLine } from '@/lib/line/notifications';
import { syncBookingToGoogleCalendar } from '@/lib/google/sync';
import { getPlanAccess } from '@/lib/plan/access';
import Stripe from 'stripe';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    const sig = (await headers()).get('stripe-signature') as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret || '');
    } catch (err: any) {
        console.error('Webhook signature verification failed.', err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const bookingId = session.payment_intent_data?.metadata?.bookingId || session.metadata?.bookingId;

        if (bookingId) {
            const supabase = await createClient();
            // Update booking status
            const { data: booking, error: fetchError } = await supabase
                .from('bookings')
                .update({
                    status: 'confirmed',
                    payment_status: 'paid',
                    stripe_payment_intent_id: session.payment_intent,
                })
                .eq('id', bookingId)
                .select('*, customers(*), booking_items(*, services(*))')
                .single();

            if (fetchError) {
                console.error('Failed to update booking after payment:', fetchError);
                return NextResponse.json({ error: 'DB Update Failed' }, { status: 500 });
            }

            // Plan Guard: Check Feature Access (LINE & Google Calendar)
            const planAccess = await getPlanAccess(booking.store_id);

            // Trigger LINE notification (Growth+ only)
            if (booking && booking.customers?.line_user_id && planAccess.canUseLine) {
                await sendBookingConfirmationLine(booking.customers.line_user_id, booking);
            }

            // Sync to Google Calendar (Growth+ only)
            if (booking && booking.staff_id && planAccess.canUseGoogleCalendar) {
                const { data: staff } = await supabase.from('staff').select('*').eq('id', booking.staff_id).single();
                if (staff?.google_refresh_token) {
                    const googleEventId = await syncBookingToGoogleCalendar(staff, booking);
                    if (googleEventId) {
                        await supabase.from('bookings').update({ google_event_id: googleEventId }).eq('id', bookingId);
                    }
                }
            }
        }
    }

    return NextResponse.json({ received: true });
}
