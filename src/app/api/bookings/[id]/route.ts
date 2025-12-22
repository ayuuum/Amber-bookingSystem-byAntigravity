/**
 * Booking Detail API
 * 
 * GET /api/bookings/:id - 予約詳細取得
 * PUT /api/bookings/:id - 予約更新（ステータス変更等）
 * DELETE /api/bookings/:id - 予約キャンセル
 * 
 * PRD Reference: Section 4-1, Section 10-1, Section 10-3
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// 許可されるステータス遷移（PRD Section 10-3準拠）
const VALID_TRANSITIONS: Record<string, string[]> = {
    'pending': ['pending_payment', 'confirmed', 'cancelled'],
    'pending_payment': ['confirmed', 'cancelled'],
    'confirmed': ['working', 'cancelled'],
    'working': ['completed'],
    'completed': [],
    'cancelled': [],
};

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        // 予約詳細取得（関連データ含む）
        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                *,
                store:store_id (id, name, slug),
                staff:staff_id (id, name, nomination_fee),
                services:booking_items (
                    id,
                    quantity,
                    unit_price,
                    service:service_id (id, title, duration_minutes)
                )
            `)
            .eq('id', id)
            .single();

        if (error || !booking) {
            return errorResponse(AmberErrors.NOT_FOUND('予約'));
        }

        return NextResponse.json({ booking });
    } catch (error: any) {
        console.error('Booking detail error:', error);
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

        // 現在の予約を取得
        const { data: currentBooking, error: fetchError } = await supabase
            .from('bookings')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchError || !currentBooking) {
            return errorResponse(AmberErrors.NOT_FOUND('予約'));
        }

        // ステータス遷移の検証
        if (body.status) {
            const allowedTransitions = VALID_TRANSITIONS[currentBooking.status] || [];
            if (!allowedTransitions.includes(body.status)) {
                return errorResponse(AmberErrors.VALIDATION_ERROR(
                    `Invalid status transition: ${currentBooking.status} → ${body.status}`
                ));
            }
        }

        // 更新データ構築
        const updateData: Record<string, any> = {};
        if (body.status !== undefined) updateData.status = body.status;
        if (body.staff_id !== undefined) updateData.staff_id = body.staff_id;
        if (body.notes !== undefined) updateData.notes = body.notes;
        if (body.start_time !== undefined) updateData.start_time = body.start_time;
        if (body.end_time !== undefined) updateData.end_time = body.end_time;

        // キャンセル時の追加情報
        if (body.status === 'cancelled') {
            updateData.cancellation_reason = body.cancellation_reason || 'manual';
            updateData.is_active = false;
        }

        const { data: booking, error } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Booking update error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        return NextResponse.json({ booking });
    } catch (error: any) {
        console.error('Booking update error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        // キャンセル理由を取得
        const body = await request.json().catch(() => ({}));
        const cancellationReason = body.reason || 'store';

        // 現在の予約を取得
        const { data: currentBooking, error: fetchError } = await supabase
            .from('bookings')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchError || !currentBooking) {
            return errorResponse(AmberErrors.NOT_FOUND('予約'));
        }

        // キャンセル可能なステータスかチェック
        const cancellableStatuses = ['pending', 'pending_payment', 'confirmed'];
        if (!cancellableStatuses.includes(currentBooking.status)) {
            return errorResponse(AmberErrors.VALIDATION_ERROR(
                `Cannot cancel booking with status: ${currentBooking.status}`
            ));
        }

        // キャンセル処理
        const { data: booking, error } = await supabase
            .from('bookings')
            .update({
                status: 'cancelled',
                cancellation_reason: cancellationReason,
                is_active: false,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Booking cancel error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        // TODO: 返金処理（Stripe Refund API）
        // TODO: 通知送信（LINE/メール）

        return NextResponse.json({
            booking,
            message: 'Booking cancelled successfully',
        });
    } catch (error: any) {
        console.error('Booking cancel error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
