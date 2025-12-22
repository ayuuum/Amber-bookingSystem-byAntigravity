/**
 * Store Detail API
 * 
 * PUT /api/stores/:id - 店舗設定更新
 * 
 * PRD Reference: Section 10-1
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        const { data: store, error } = await supabase
            .from('stores')
            .select(`
                *,
                organization:organization_id (id, name, slug)
            `)
            .eq('id', id)
            .single();

        if (error || !store) {
            return errorResponse(AmberErrors.NOT_FOUND('店舗'));
        }

        return NextResponse.json({ store });
    } catch (error: any) {
        console.error('Store detail error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        const body = await request.json();

        // 更新可能フィールド
        const updateData: Record<string, any> = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.business_hours !== undefined) updateData.business_hours = body.business_hours;
        if (body.address !== undefined) updateData.address = body.address;
        if (body.phone !== undefined) updateData.phone = body.phone;
        if (body.cancellation_policy !== undefined) updateData.cancellation_policy = body.cancellation_policy;

        const { data: store, error } = await supabase
            .from('stores')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Store update error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        return NextResponse.json({ store });
    } catch (error: any) {
        console.error('Store update error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
