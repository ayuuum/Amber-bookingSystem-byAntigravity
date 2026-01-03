import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Org Admin profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'hq_admin') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();

        if (!org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        let stripeAccountId = org.stripe_account_id;

        if (!stripeAccountId) {
            // Create a new Connect account
            const account = await stripe.accounts.create({
                type: 'standard', // Use standard for simplicity, or express for more control
                email: user.email,
                metadata: {
                    organizationId: org.id,
                },
            });
            stripeAccountId = account.id;

            // Update org with the new account ID
            await supabase
                .from('organizations')
                .update({ stripe_account_id: stripeAccountId })
                .eq('id', org.id);
        }

        // Create Account Link
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?status=stripe_refresh`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?status=stripe_success`,
            type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error: any) {
        console.error('Stripe Connect error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
