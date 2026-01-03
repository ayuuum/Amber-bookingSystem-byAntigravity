import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({
                completed: false,
                steps: {
                    organization: { completed: false, required: true },
                    stripe: { completed: false, required: true },
                    plan: { completed: false, required: false },
                    store: { completed: false, required: true },
                    service: { completed: false, required: true },
                    staff: { completed: false, required: false },
                },
            });
        }

        const orgId = profile.organization_id;

        // Check organization info
        const { data: org } = await supabase
            .from('organizations')
            .select('name, slug, stripe_account_id, plan_type')
            .eq('id', orgId)
            .single();

        // Check stores
        const { data: stores } = await supabase
            .from('stores')
            .select('id')
            .eq('organization_id', orgId)
            .limit(1);

        // Check services
        const { data: services } = await supabase
            .from('services')
            .select('id')
            .eq('organization_id', orgId)
            .limit(1);

        // Check staff
        const { data: staff } = await supabase
            .from('staff')
            .select('id')
            .eq('organization_id', orgId)
            .limit(1);

        const steps = {
            organization: {
                completed: !!(org?.name && org?.slug),
                required: true,
                link: '/admin/settings',
            },
            stripe: {
                completed: !!org?.stripe_account_id,
                required: true,
                link: '/admin/settings',
            },
            plan: {
                completed: !!org?.plan_type,
                required: false,
                link: '/admin/plan',
            },
            store: {
                completed: (stores?.length || 0) > 0,
                required: true,
                link: '/admin/stores',
            },
            service: {
                completed: (services?.length || 0) > 0,
                required: true,
                link: '/admin/services',
            },
            staff: {
                completed: (staff?.length || 0) > 0,
                required: false,
                link: '/admin/staff',
            },
        };

        const allRequiredCompleted = Object.values(steps)
            .filter(step => step.required)
            .every(step => step.completed);

        return NextResponse.json({
            completed: allRequiredCompleted,
            steps,
        });

    } catch (error: any) {
        console.error('Onboarding Status Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}














