import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { bookingId, cartItems, storeSlug, successUrl, cancelUrl } = body;

        const supabase = await createClient();

        // 1. Get Store & Organization (to find stripe_account_id)
        const { data: store } = await supabase
            .from('stores')
            .select('*, organizations(*)')
            .eq('slug', storeSlug)
            .single();

        if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

        // Determine destination account (Priority: Store > Org)
        const connectedAccountId = store.stripe_account_id || store.organizations.stripe_account_id;

        if (!connectedAccountId) {
            return NextResponse.json({ error: 'This store has not enabled online payments.' }, { status: 400 });
        }

        // 2. Fetch Services to calculate amount (Don't trust client)
        const serviceIds = cartItems.map((i: any) => i.serviceId);
        const { data: services } = await supabase
            .from('services')
            .select('*')
            .in('id', serviceIds);

        let totalAmount = 0;
        const lineItems = cartItems.map((item: any) => {
            const svc = services?.find(s => s.id === item.serviceId);
            if (!svc) throw new Error('Service not found');
            const subtotal = svc.price * item.quantity;
            totalAmount += subtotal;

            return {
                price_data: {
                    currency: 'jpy',
                    product_data: {
                        name: svc.title,
                        description: svc.description,
                    },
                    unit_amount: svc.price,
                },
                quantity: item.quantity,
            };
        });

        // 3. Create Checkout Session
        const applicationFeeAmount = Math.floor(totalAmount * 0.07); // 7% platform fee

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            payment_intent_data: {
                application_fee_amount: applicationFeeAmount,
                transfer_data: {
                    destination: connectedAccountId,
                },
                metadata: {
                    bookingId,
                    storeId: store.id,
                },
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
