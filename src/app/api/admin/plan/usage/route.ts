import { createClient } from '@/lib/supabase/server';
import { checkResourceLimit, getPlanAccess } from '@/lib/plan/access';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const orgId = profile.organization_id;

    try {
        const [stores, staff, houseAssets, access] = await Promise.all([
            checkResourceLimit(orgId, 'stores'),
            checkResourceLimit(orgId, 'staff'),
            checkResourceLimit(orgId, 'house_assets'),
            getPlanAccess(orgId)
        ]);

        const { data: org } = await supabase
            .from('organizations')
            .select('plan_type')
            .eq('id', orgId)
            .single();

        return NextResponse.json({
            planType: org?.plan_type || 'starter',
            limits: {
                stores: { current: stores.current, limit: stores.limit },
                staff: { current: staff.current, limit: staff.limit },
                houseAssets: { current: houseAssets.current, limit: houseAssets.limit }
            },
            access
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
