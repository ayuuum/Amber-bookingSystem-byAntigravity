/**
 * HQ Billing API
 * 
 * GET /api/hq/billing - 本部から各店舗への請求データ一覧
 * 
 * PRD Reference: Section 5-2, Section 10-1
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
        if (profile?.role !== 'hq_admin') return errorResponse(AmberErrors.FORBIDDEN());

        const searchParams = request.nextUrl.searchParams;
        const month = searchParams.get('month') || new Date().toISOString();
        const startDate = startOfMonth(new Date(month));
        const endDate = endOfMonth(new Date(month));

        // 各店舗の月間売上と手数料(7%)を集計
        const { data: stores } = await supabase.from('stores').select('id, name');

        const billings = await Promise.all((stores || []).map(async (store) => {
            const { data: bookings } = await supabase
                .from('bookings')
                .select('total_price')
                .eq('store_id', store.id)
                .eq('status', 'completed')
                .gte('start_time', startDate.toISOString())
                .lte('start_time', endDate.toISOString());

            const monthlyGMV = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
            const platformFee = Math.floor(monthlyGMV * 0.07); // 7% 手数料

            return {
                store_id: store.id,
                store_name: store.name,
                gmv: monthlyGMV,
                fee: platformFee,
                count: bookings?.length || 0,
                status: 'pending', // 請求状態
            };
        }));

        return NextResponse.json({ billings });
    } catch (error) {
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
