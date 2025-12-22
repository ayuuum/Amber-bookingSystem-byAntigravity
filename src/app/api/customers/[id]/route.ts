/**
 * Customer Detail API
 * 
 * GET /api/customers/:id - 顧客詳細（予約履歴含む）
 * PUT /api/customers/:id - 顧客情報更新
 * 
 * PRD Reference: Section 4-2, Section 10-1
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

        // 顧客情報取得
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (customerError || !customer) {
            return errorResponse(AmberErrors.NOT_FOUND('顧客'));
        }

        // 予約履歴取得
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                id,
                start_time,
                end_time,
                status,
                total_price,
                channel,
                staff:staff_id (id, name),
                services:booking_items (
                    service:service_id (title, price)
                )
            `)
            .eq('customer_phone', customer.phone)
            .eq('store_id', customer.store_id)
            .order('start_time', { ascending: false })
            .limit(50);

        // 集計データ計算
        const stats = {
            total_visits: customer.total_visits || 0,
            total_spent: customer.total_spent || 0,
            last_visit_at: customer.last_visit_at,
            ltv: customer.total_spent || 0,
        };

        return NextResponse.json({
            customer,
            bookings: bookings || [],
            stats,
        });
    } catch (error: any) {
        console.error('Customer detail error:', error);
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
        if (body.full_name !== undefined) updateData.full_name = body.full_name;
        if (body.email !== undefined) updateData.email = body.email;
        if (body.address !== undefined) updateData.address = body.address;
        if (body.notes !== undefined) updateData.notes = body.notes;

        const { data: customer, error } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Customer update error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        return NextResponse.json({ customer });
    } catch (error: any) {
        console.error('Customer update error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
