import { createClient } from '@/lib/supabase/server';
import { checkResourceLimit, getPlanAccess } from '@/lib/plan/access';
import { NextResponse } from 'next/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return errorResponse(AmberErrors.UNAUTHORIZED());

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) return errorResponse(AmberErrors.FORBIDDEN());

    const orgId = profile.organization_id;

    try {
        const [stores, staff, houseAssets, access] = await Promise.all([
            checkResourceLimit(orgId, 'stores'),
            checkResourceLimit(orgId, 'staff'),
            checkResourceLimit(orgId, 'house_assets'),
            getPlanAccess(orgId)
        ]);

        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('plan_type')
            .eq('id', orgId)
            .single();

        if (orgError) {
            logger.error('Error fetching organization', { error: orgError, orgId });
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

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
        logger.error('Plan usage API error', { error, orgId });
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
