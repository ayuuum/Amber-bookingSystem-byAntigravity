/**
 * HQ Analytics API
 * 
 * GET /api/hq/analytics - 全店舗の横断分析データ取得
 * 
 * PRD Reference: Section 8-2, Section 10-1
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // 認証チェック (Super Adminのみ)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'hq_admin') {
            return errorResponse(AmberErrors.FORBIDDEN());
        }

        // 1. 全店舗の基本統計
        const { data: storeStats, error: statsError } = await supabase
            .rpc('get_hq_dashboard_stats'); // 将来的にビューやRPCで実装

        // モックデータ/簡易実装（RPCがない場合のフォールバック）
        const { data: allBookings } = await supabase
            .from('bookings')
            .select('status, total_price, created_at, store_id');

        const totalSales = allBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
        const totalBookings = allBookings?.length || 0;
        const completedBookings = allBookings?.filter(b => b.status === 'completed').length || 0;

        // 2. 店舗別ランキング
        const { data: storeRanking } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                bookings(count),
                total_sales:bookings(total_price)
            `);

        return NextResponse.json({
            summary: {
                total_sales: totalSales,
                total_bookings: totalBookings,
                completed_rate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
                active_stores: storeRanking?.length || 0,
            },
            store_ranking: storeRanking || [],
        });
    } catch (error: any) {
        console.error('HQ Analytics API error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
