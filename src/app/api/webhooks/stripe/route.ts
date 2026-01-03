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
            // Fetch booking to validate TTL
            const { data: currentBooking, error: currentError } = await supabase
                .from('bookings')
                .select('id, store_id, organization_id, status, expires_at, customers(*), booking_items(*, services(*))')
                .eq('id', bookingId)
                .single();

            if (currentError || !currentBooking) {
                console.error('Failed to fetch booking before confirm:', currentError);
                return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
            }

            // TTL check for pending_payment
            if (currentBooking.status === 'pending_payment' && currentBooking.expires_at && new Date(currentBooking.expires_at) < new Date()) {
                console.warn('Payment succeeded but booking expired, skip confirm:', bookingId);
                return NextResponse.json({ skipped: true, reason: 'expired' });
            }

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
            const { data: store } = await supabase
                .from('stores')
                .select('organization_id')
                .eq('id', booking.store_id)
                .single();
            const planAccess = await getPlanAccess(store?.organization_id || booking.organization_id || '');

            // Record payment_event for idempotency tracking
            const stripeEventId = session.id || event.id;
            // Ignore conflicts (idempotency)
            try {
                await supabase
                    .from('payment_events')
                    .insert({
                        stripe_event_id: stripeEventId,
                        booking_id: bookingId,
                        event_type: event.type,
                        payload: session,
                    })
                    .select()
                    .single();
            } catch (insertError) {
                // Ignore conflicts (idempotency)
            }

            // イベント駆動アーキテクチャ: 決済完了イベントを発行
            // デュアルモード: 環境変数 USE_EVENT_SYSTEM が true の場合のみイベント発行
            const useEventSystem = process.env.USE_EVENT_SYSTEM === 'true';

            if (useEventSystem) {
                // イベント発行（非同期処理）
                const { publishEvent } = await import('@/lib/events/publisher');
                await publishEvent(supabase, {
                    eventType: 'payment.completed',
                    entityType: 'booking',
                    entityId: bookingId,
                    payload: {
                        booking,
                        planAccess,
                    },
                    maxRetries: 3,
                });
            } else {
                // 既存の同期処理（デュアルモード）
                // Trigger LINE notification (Growth+ only)
                // 【技術負債対策】外部連携の失敗が決済処理を阻害しないよう、try/catchで分離
                if (booking && booking.customers?.line_user_id && planAccess.canUseLine) {
                    try {
                        await sendBookingConfirmationLine(booking.customers.line_user_id, booking);
                    } catch (error) {
                        console.error('LINE notification failed in webhook (non-blocking)', error);
                        // 決済は成功扱いのまま続行
                    }
                }

                // Sync to Google Calendar (Growth+ only)
                // 失敗しても決済処理は成功扱い
                if (booking && booking.staff_id && planAccess.canUseGoogleCalendar) {
                    try {
                        const { data: staff } = await supabase.from('staff').select('*').eq('id', booking.staff_id).single();
                        if (staff?.google_refresh_token) {
                            const googleEventId = await syncBookingToGoogleCalendar(staff, booking);
                            if (googleEventId) {
                                await supabase.from('bookings').update({ google_event_id: googleEventId }).eq('id', bookingId);
                            }
                        }
                    } catch (error) {
                        console.error('Google Calendar sync failed in webhook (non-blocking)', error);
                        // 決済は成功扱いのまま続行
                    }
                }
            }
        }
    }

    return NextResponse.json({ received: true });
}
