import { checkResourceLimit } from '@/lib/plan/access';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ApiContext } from '@/lib/api/middleware';
import { AmberErrors, errorResponse } from '@/lib/errors';

async function postHandler(request: NextRequest, context: ApiContext) {
    const { supabase, user } = context;

    if (!user.organizationId) {
        return errorResponse(AmberErrors.FORBIDDEN());
    }

    const body = await request.json();
    const { name, email, phone, role = 'staff' } = body;

    // Plan Guard: Check Staff Limit
    const { allowed, current, limit } = await checkResourceLimit(user.organizationId, 'staff');

    if (!allowed) {
        return errorResponse(AmberErrors.PLAN_STAFF_LIMIT(current, limit));
    }

    // Create Staff
    const { data: staff, error: createError } = await supabase
        .from('staff')
        .insert({
            name,
            email,
            phone,
            role,
            organization_id: user.organizationId,
            is_active: true
        })
        .select()
        .single();

    if (createError) {
        return errorResponse(AmberErrors.DATABASE_ERROR(createError.message));
    }

    return NextResponse.json(staff);
}

async function getHandler(request: NextRequest, context: ApiContext) {
    const { supabase, user } = context;

    if (!user.organizationId) {
        return NextResponse.json([]);
    }

    const { data: staff, error } = await supabase
        .from('staff')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: true });

    if (error) {
        return errorResponse(AmberErrors.DATABASE_ERROR());
    }

    return NextResponse.json(staff || []);
}

export const POST = withAuth(postHandler);
export const GET = withAuth(getHandler);
