/**
 * Staff Detail API
 * 
 * PUT /api/staff/:id - スタッフ更新
 * DELETE /api/staff/:id - スタッフ削除（論理削除）
 * 
 * PRD Reference: Section 10-1
 */

import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ id: string }>;
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
        if (body.nomination_fee !== undefined) updateData.nomination_fee = body.nomination_fee;
        if (body.color !== undefined) updateData.color = body.color;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;
        if (body.google_calendar_id !== undefined) updateData.google_calendar_id = body.google_calendar_id;

        const { data: staff, error } = await supabase
            .from('staff')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Staff update error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        return NextResponse.json({ staff });
    } catch (error: any) {
        console.error('Staff update error:', error);
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

        // 論理削除（is_active = false）
        const { data: staff, error } = await supabase
            .from('staff')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Staff delete error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        return NextResponse.json({
            staff,
            message: 'Staff deactivated successfully',
        });
    } catch (error: any) {
        console.error('Staff delete error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
