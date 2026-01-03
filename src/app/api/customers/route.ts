/**
 * Customer Management API
 * 
 * GET /api/customers - 顧客一覧取得（検索・フィルタ対応）
 * 
 * PRD Reference: Section 4-2, Section 10-1
 */

import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ApiContext } from '@/lib/api/middleware';

async function handler(request: NextRequest, context: ApiContext) {
    const { supabase } = context;

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('store_id');
    const search = searchParams.get('search'); // 電話番号 or 名前検索
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!storeId) {
        return errorResponse(AmberErrors.VALIDATION_ERROR('store_id is required'));
    }

    // 顧客一覧クエリ構築
    let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
        .order('last_visit_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

    // 検索条件追加
    if (search) {
        query = query.or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: customers, count, error } = await query;

    if (error) {
        return errorResponse(AmberErrors.DATABASE_ERROR());
    }

    return NextResponse.json({
        customers: customers || [],
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    });
}

export const GET = withAuth(handler);
