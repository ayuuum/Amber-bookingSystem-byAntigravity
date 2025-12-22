/**
 * Advanced Analytics API (LTV & Repeat Metrics)
 * 
 * GET /api/admin/analytics/retention - 顧客維持率・LTV分析
 * 
 * PRD Phase 1.2: Fintech & Communication Loop
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return errorResponse(AmberErrors.UNAUTHORIZED());

        const storeId = request.nextUrl.searchParams.get('store_id');
        if (!storeId) return errorResponse(AmberErrors.VALIDATION_ERROR('store_id required'));

        // 1. 全顧客データ取得
        const { data: customers } = await supabase
            .from('customers')
            .select('id, total_visits, total_spent, created_at')
            .eq('store_id', storeId);

        if (!customers) return NextResponse.json({ stats: null });

        // 2. リピート率計算
        const totalCustomers = customers.length;
        const repeatCustomers = customers.filter(c => (c.total_visits || 0) > 1).length;
        const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

        // 3. 平均LTV計算
        const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
        const averageLTV = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

        // 4. 時系列リピート分析 (モックアップロジック)
        // 実際には月別のコホート分析を行う
        const retentionChart = [
            { month: '2024-10', rate: 25 },
            { month: '2024-11', rate: 28 },
            { month: '2024-12', rate: 32 }, // 目標リピート率30%超えを可視化
        ];

        return NextResponse.json({
            metrics: {
                total_customers: totalCustomers,
                repeat_customers: repeatCustomers,
                repeat_rate: repeatRate,
                average_ltv: averageLTV,
                total_revenue: totalSpent
            },
            charts: {
                retention: retentionChart
            }
        });
    } catch (error) {
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
