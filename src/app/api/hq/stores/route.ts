/**
 * HQ Stores Management API
 * 
 * GET /api/hq/stores - 全店舗一覧
 * POST /api/hq/stores - 新規店舗作成（組織・管理者紐付含む）
 * 
 * PRD Reference: Section 10-1
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Super Admin チェック
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
        if (profile?.role !== 'hq_admin') return errorResponse(AmberErrors.FORBIDDEN());

        const { data: stores, error } = await supabase
            .from('stores')
            .select(`
                *,
                organization:organization_id (id, name, slug)
            `)
            .order('created_at', { ascending: false });

        if (error) return errorResponse(AmberErrors.DATABASE_ERROR());

        return NextResponse.json({ stores });
    } catch (error) {
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
        if (profile?.role !== 'hq_admin') return errorResponse(AmberErrors.FORBIDDEN());

        const body = await request.json();

        // 1. 店舗作成
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .insert({
                organization_id: body.organization_id,
                name: body.name,
                slug: body.slug,
                address: body.address,
                phone: body.phone,
                business_hours: body.business_hours,
            })
            .select()
            .single();

        if (storeError) return errorResponse(AmberErrors.DATABASE_ERROR());

        // 2. 初期管理者のアサイン（オプション）
        if (body.admin_profile_id) {
            await supabase.from('profiles_stores').insert({
                profile_id: body.admin_profile_id,
                store_id: store.id,
                role: 'admin'
            });
        }

        return NextResponse.json({ store }, { status: 201 });
    } catch (error) {
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
