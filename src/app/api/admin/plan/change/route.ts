import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const PLAN_LIMITS: Record<'starter' | 'growth' | 'enterprise', { stores: number; staff: number; houseAssets: number }> = {
    starter: {
        stores: 1,
        staff: 3,
        houseAssets: 50,
    },
    growth: {
        stores: 3,
        staff: 999,
        houseAssets: 500,
    },
    enterprise: {
        stores: 999,
        staff: 999,
        houseAssets: 9999,
    },
};

export async function POST(req: Request) {
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

        if (!profile?.organization_id || profile.role !== 'hq_admin') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const body = await req.json();
        const { planType } = body;

        if (!planType || !['starter', 'growth', 'enterprise'].includes(planType)) {
            return NextResponse.json(
                { error: '無効なプランタイプです。' },
                { status: 400 }
            );
        }

        const limits = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS];

        // Update organization plan
        const { error: updateError } = await supabase
            .from('organizations')
            .update({
                plan_type: planType,
                max_stores: limits.stores,
                max_staff: limits.staff,
                max_house_assets: limits.houseAssets,
            })
            .eq('id', profile.organization_id);

        if (updateError) {
            return NextResponse.json(
                { error: `プラン更新エラー: ${updateError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            planType,
            limits,
        });

    } catch (error: any) {
        console.error('Plan Change Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}



