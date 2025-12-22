import { createClient } from '@/lib/supabase/server';
import { checkResourceLimit } from '@/lib/plan/access';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    try {
        const body = await req.json();
        const { name, email, phone, role = 'staff' } = body;

        // 1. Plan Guard: Check Staff Limit
        const { allowed, current, limit } = await checkResourceLimit(profile.organization_id, 'staff');

        if (!allowed) {
            return NextResponse.json({
                error: 'PLAN_LIMIT_REACHED',
                message: `現在のプランのスタッフ数上限（${limit}名）に達しています。上位プランへのアップグレードをご検討ください。`,
                current,
                limit
            }, { status: 403 });
        }

        // 2. Create Staff (Assuming simplified creation flow for Phase 1.3)
        // In a real app, this might involve Auth logic too.
        const { data: staff, error: createError } = await supabase
            .from('staff')
            .insert({
                name,
                email,
                phone,
                role,
                organization_id: profile.organization_id,
                is_active: true
            })
            .select()
            .single();

        if (createError) throw createError;

        return NextResponse.json(staff);

    } catch (error: any) {
        console.error('Create Staff Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) return NextResponse.json([]);

    const { data: staff } = await supabase
        .from('staff')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true });

    return NextResponse.json(staff || []);
}
