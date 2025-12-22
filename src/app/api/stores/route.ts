import { createClient } from '@/lib/supabase/server';
import { checkResourceLimit } from '@/lib/plan/access';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Get User Profile & Org
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    try {
        const body = await req.json();
        const { name, slug, address } = body;

        // 2. Plan Guard: Check Store Limit
        const { allowed, current, limit } = await checkResourceLimit(profile.organization_id, 'stores');

        if (!allowed) {
            return NextResponse.json({
                error: 'PLAN_LIMIT_REACHED',
                message: `現在のプランの店舗数上限（${limit}店舗）に達しています。上位プランへのアップグレードをご検討ください。`,
                current,
                limit
            }, { status: 403 });
        }

        // 3. Create Store
        const { data: store, error: createError } = await supabase
            .from('stores')
            .insert({
                name,
                slug,
                address,
                organization_id: profile.organization_id
            })
            .select()
            .single();

        if (createError) throw createError;

        return NextResponse.json(store);

    } catch (error: any) {
        console.error('Create Store Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) return NextResponse.json([]);

    const { data: stores } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true });

    return NextResponse.json(stores || []);
}
