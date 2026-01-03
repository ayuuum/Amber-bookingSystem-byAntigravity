/**
 * Booking Detail API
 * 
 * GET /api/bookings/:id - 予約詳細取得
 * PUT /api/bookings/:id - 予約更新（ステータス変更等）
 * DELETE /api/bookings/:id - 予約キャンセル
 * 
 * PRD Reference: Section 4-1, Section 10-1, Section 10-3
 */

import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { sendBookingCancelledLine } from '@/lib/line/notifications';
import { logAuditEvent } from '@/lib/audit-log';
import { withAuth, ApiContext } from '@/lib/api/middleware';

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

async function getHandler(request: NextRequest, { params }: RouteParams, context: ApiContext) {
    const { id } = await params;
    const { supabase } = context;

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
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return withAuth((req, ctx) => getHandler(req, { params }, ctx))(request);
}

async function putHandler(request: NextRequest, { params }: RouteParams, context: ApiContext) {
    const { id } = await params;
    const { supabase, user } = context;

    const body = await request.json();

    // 現在の予約を取得
    const { data: currentBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, status, start_time, total_amount, payment_method, payment_status, stripe_payment_intent_id, customer_id, customers(line_user_id), store_id, organization_id')
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
        return errorResponse(AmberErrors.DATABASE_ERROR());
    }

    // 監査ログ記録（予約更新）
    if (booking && currentBooking.organization_id) {
        await logAuditEvent(supabase, {
            organizationId: currentBooking.organization_id,
            storeId: currentBooking.store_id,
            operationType: 'booking.updated',
            entityType: 'booking',
            entityId: id,
            userId: user.id,
            metadata: {
                oldStatus: currentBooking.status,
                newStatus: booking.status,
                changes: updateData,
            },
        });
    }

    return NextResponse.json({ booking });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    return withAuth((req, ctx) => putHandler(req, { params }, ctx))(request);
}

async function deleteHandler(request: NextRequest, { params }: RouteParams, context: ApiContext) {
    const { id } = await params;
    const { supabase, user } = context;

    // キャンセル理由を取得
    const body = await request.json().catch(() => ({}));
    const cancellationReason = body.reason || 'store';

        // 現在の予約を取得
        const { data: currentBooking, error: fetchError } = await supabase
            .from('bookings')
            .select('status, organization_id, store_id, start_time, payment_method, payment_status, total_amount, stripe_payment_intent_id')
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

        // キャンセルポリシー計算
        const { data: store } = await supabase
            .from('stores')
            .select('cancellation_policy')
            .eq('id', currentBooking.store_id)
            .single();

        const policy = (store?.cancellation_policy as any) || {
            free_until_hours: 48,
            tiers: [
                { hours_before: 48, fee_percent: 0 },
                { hours_before: 24, fee_percent: 30 },
                { hours_before: 0, fee_percent: 50 },
            ],
        };

        const hoursUntil = currentBooking.start_time
            ? (new Date(currentBooking.start_time).getTime() - Date.now()) / (1000 * 60 * 60)
            : 0;

        const sortedTiers = (policy.tiers || []).sort((a: any, b: any) => b.hours_before - a.hours_before);
        let feePercent = 100;
        for (const t of sortedTiers) {
            if (hoursUntil >= t.hours_before) {
                feePercent = t.fee_percent;
                break;
            }
        }
        if (hoursUntil <= 0) feePercent = 100;

        // 返金計算（オンライン決済かつ決済済のみ）
        let refundAmount: number | undefined;
        if (currentBooking.payment_method === 'online_card' && currentBooking.payment_status === 'paid' && currentBooking.total_amount) {
            const refundable = Math.max(currentBooking.total_amount * (1 - feePercent / 100), 0);
            refundAmount = Math.floor(refundable);

            if (refundAmount > 0 && currentBooking.stripe_payment_intent_id) {
                try {
                    await stripe.refunds.create({
                        payment_intent: currentBooking.stripe_payment_intent_id,
                        amount: refundAmount,
                    });
                } catch (refundErr: any) {
                    console.error('Refund failed:', refundErr);
                    return errorResponse(AmberErrors.PAY_REFUND_FAILED());
                }
            }
        }

        // キャンセル処理
        const { data: booking, error } = await supabase
            .from('bookings')
            .update({
                status: 'cancelled',
                cancellation_reason: cancellationReason,
                is_active: false,
                refund_amount: refundAmount,
                refund_at: refundAmount !== undefined ? new Date().toISOString() : null,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Booking cancel error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        // 監査ログ記録（予約キャンセル）
        if (booking && currentBooking.organization_id) {
            await logAuditEvent(supabase, {
                organizationId: currentBooking.organization_id,
                storeId: currentBooking.store_id,
                operationType: 'booking.cancelled',
                entityType: 'booking',
                entityId: id,
                userId: user.id,
                metadata: {
                    cancellationReason,
                    refundAmount,
                    feePercent,
                },
            });
        }

        // 通知送信（LINE）
        if (booking && booking.customers?.line_user_id) {
            await sendBookingCancelledLine(booking.customers.line_user_id, booking, refundAmount, feePercent);
        }

    return NextResponse.json({
        booking,
        message: 'Booking cancelled successfully',
    });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    return withAuth((req, ctx) => deleteHandler(req, { params }, ctx))(request);
}
