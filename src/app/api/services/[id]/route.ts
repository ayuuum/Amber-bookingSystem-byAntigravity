/**
 * Service Detail API
 * 
 * PUT /api/services/:id - サービス更新
 * DELETE /api/services/:id - サービス削除（論理削除）
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

        // バリデーション（PRD Section 10-4準拠）
        if (body.title && (body.title.length < 1 || body.title.length > 100)) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('タイトルは1-100文字'));
        }
        if (body.price !== undefined && (body.price < 0 || body.price > 10000000)) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('価格は0-10,000,000円'));
        }
        if (body.duration_minutes !== undefined &&
            (body.duration_minutes < 15 || body.duration_minutes > 480 || body.duration_minutes % 15 !== 0)) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('所要時間は15-480分、15分刻み'));
        }

        // 更新可能フィールド
        const updateData: Record<string, any> = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.price !== undefined) updateData.price = body.price;
        if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;
        if (body.category !== undefined) updateData.category = body.category;

        const { data: service, error } = await supabase
            .from('services')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Service update error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        return NextResponse.json({ service });
    } catch (error: any) {
        console.error('Service update error:', error);
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
        const { data: service, error } = await supabase
            .from('services')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Service delete error:', error);
            return errorResponse(AmberErrors.DATABASE_ERROR());
        }

        return NextResponse.json({
            service,
            message: 'Service deactivated successfully',
        });
    } catch (error: any) {
        console.error('Service delete error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
