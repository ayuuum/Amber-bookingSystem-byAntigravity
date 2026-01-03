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
    const { name, slug, address } = body;

    // Plan Guard: Check Store Limit
    const { allowed, current, limit } = await checkResourceLimit(user.organizationId, 'stores');

    if (!allowed) {
        return errorResponse(AmberErrors.PLAN_STORE_LIMIT(current, limit));
    }

    // Create Store
    const { data: store, error: createError } = await supabase
        .from('stores')
        .insert({
            name,
            slug,
            address,
            organization_id: user.organizationId
        })
        .select()
        .single();

    if (createError) {
        return errorResponse(AmberErrors.DATABASE_ERROR(createError.message));
    }

    return NextResponse.json(store);
}

async function getHandler(request: NextRequest, context: ApiContext) {
    const { supabase, user } = context;

    if (!user.organizationId) {
        return NextResponse.json([]);
    }

    const { data: stores, error } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: true });

    if (error) {
        return errorResponse(AmberErrors.DATABASE_ERROR());
    }

    return NextResponse.json(stores || []);
}

export const POST = withAuth(postHandler);
export const GET = withAuth(getHandler);
