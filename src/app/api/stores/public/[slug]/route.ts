/**
 * Store Public API
 * 
 * GET /api/stores/public/:slug - 店舗公開情報取得（予約フォーム用）
 * 
 * PRD Reference: Section 10-1
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params;
        const supabase = await createClient();

        // 店舗情報取得（公開フィールドのみ）
        const { data: store, error } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                slug,
                address,
                phone,
                business_hours,
                organization:organization_id (
                    id,
                    name,
                    slug
                )
            `)
            .eq('slug', slug)
            .single();

        if (error || !store) {
            return errorResponse(AmberErrors.NOT_FOUND('店舗'));
        }

        // アクティブなサービス一覧
        const { data: services } = await supabase
            .from('services')
            .select('id, title, description, price, duration_minutes, category')
            .eq('store_id', store.id)
            .eq('is_active', true)
            .order('category', { ascending: true });

        // アクティブなスタッフ一覧（指名用）
        const { data: staff } = await supabase
            .from('staff')
            .select('id, name, nomination_fee')
            .eq('is_active', true)
            .in('id', (
                await supabase
                    .from('staff_stores')
                    .select('staff_id')
                    .eq('store_id', store.id)
            ).data?.map(s => s.staff_id) || []);

        return NextResponse.json({
            store,
            services: services || [],
            staff: staff || [],
        });
    } catch (error: any) {
        console.error('Store public API error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
