/**
 * Store LINE Integration API
 * 
 * GET /api/stores/[id]/line - 店舗のLINE連携情報を取得
 * PUT /api/stores/[id]/line - 店舗のLINE連携情報を保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { z } from 'zod';

interface RouteParams {
    params: Promise<{ id: string }>;
}

const lineIntegrationSchema = z.object({
    channel_access_token: z.string().min(1, 'Channel Access Tokenは必須です'),
    channel_secret: z.string().min(1, 'Channel Secretは必須です'),
});

/**
 * GET /api/stores/[id]/line
 * 店舗のLINE連携情報を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        // プロフィール取得
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, organization_id, store_id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return errorResponse(AmberErrors.FORBIDDEN());
        }

        // 店舗情報取得
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, organization_id, line_channel_access_token, line_channel_secret')
            .eq('id', id)
            .single();

        if (storeError || !store) {
            return errorResponse(AmberErrors.NOT_FOUND('店舗'));
        }

        // 権限チェック: hq_admin または該当店舗の store_admin
        const isHqAdmin = profile.role === 'hq_admin' && profile.organization_id === store.organization_id;
        const isStoreAdmin = profile.role === 'store_admin' && profile.store_id === store.id;

        if (!isHqAdmin && !isStoreAdmin) {
            return errorResponse(AmberErrors.FORBIDDEN());
        }

        // Secretをマスク
        const maskedSecret = store.line_channel_secret
            ? `${store.line_channel_secret.substring(0, 4)}...${store.line_channel_secret.substring(store.line_channel_secret.length - 4)}`
            : undefined;

        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/line/webhook`;

        return NextResponse.json({
            is_connected: !!(store.line_channel_access_token && store.line_channel_secret),
            channel_secret_masked: maskedSecret,
            webhook_url: webhookUrl,
        });
    } catch (error: any) {
        console.error('Store LINE get error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

/**
 * PUT /api/stores/[id]/line
 * 店舗のLINE連携情報を保存
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        // プロフィール取得
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, organization_id, store_id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return errorResponse(AmberErrors.FORBIDDEN());
        }

        // 店舗情報取得
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, organization_id')
            .eq('id', id)
            .single();

        if (storeError || !store) {
            return errorResponse(AmberErrors.NOT_FOUND('店舗'));
        }

        // 権限チェック: hq_admin または該当店舗の store_admin
        const isHqAdmin = profile.role === 'hq_admin' && profile.organization_id === store.organization_id;
        const isStoreAdmin = profile.role === 'store_admin' && profile.store_id === store.id;

        if (!isHqAdmin && !isStoreAdmin) {
            return errorResponse(AmberErrors.FORBIDDEN());
        }

        // リクエストボディのバリデーション
        const body = await request.json();
        const validated = lineIntegrationSchema.safeParse(body);

        if (!validated.success) {
            return errorResponse(AmberErrors.VALIDATION_ERROR(validated.error.errors[0]?.message || 'バリデーションエラー'));
        }

        // LINE連携情報を保存
        const { data: updatedStore, error: updateError } = await supabase
            .from('stores')
            .update({
                line_channel_access_token: validated.data.channel_access_token,
                line_channel_secret: validated.data.channel_secret,
            })
            .eq('id', id)
            .select('id, line_channel_access_token, line_channel_secret')
            .single();

        if (updateError) {
            console.error('Store LINE update error:', updateError);
            return errorResponse(AmberErrors.DATABASE_ERROR(updateError.message));
        }

        return NextResponse.json({
            success: true,
            store: {
                id: updatedStore.id,
                is_connected: !!(updatedStore.line_channel_access_token && updatedStore.line_channel_secret),
            },
        });
    } catch (error: any) {
        console.error('Store LINE update error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}

/**
 * DELETE /api/stores/[id]/line
 * 店舗のLINE連携情報を削除（連携解除）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return errorResponse(AmberErrors.UNAUTHORIZED());
        }

        // プロフィール取得
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, organization_id, store_id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return errorResponse(AmberErrors.FORBIDDEN());
        }

        // 店舗情報取得
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, organization_id')
            .eq('id', id)
            .single();

        if (storeError || !store) {
            return errorResponse(AmberErrors.NOT_FOUND('店舗'));
        }

        // 権限チェック: hq_admin または該当店舗の store_admin
        const isHqAdmin = profile.role === 'hq_admin' && profile.organization_id === store.organization_id;
        const isStoreAdmin = profile.role === 'store_admin' && profile.store_id === store.id;

        if (!isHqAdmin && !isStoreAdmin) {
            return errorResponse(AmberErrors.FORBIDDEN());
        }

        // LINE連携情報を削除
        const { error: updateError } = await supabase
            .from('stores')
            .update({
                line_channel_access_token: null,
                line_channel_secret: null,
            })
            .eq('id', id);

        if (updateError) {
            console.error('Store LINE delete error:', updateError);
            return errorResponse(AmberErrors.DATABASE_ERROR(updateError.message));
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Store LINE delete error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}







