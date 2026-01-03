/**
 * Store LINE Integration Verification API
 * 
 * POST /api/stores/[id]/line/verify - 店舗のLINE連携情報を検証（動作確認）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AmberErrors, errorResponse } from '@/lib/errors';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/stores/[id]/line/verify
 * 店舗のLINE連携情報を検証
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

        // LINE連携情報が設定されているかチェック
        if (!store.line_channel_access_token) {
            return NextResponse.json({
                verified: false,
                error: 'LINE連携情報が設定されていません',
            });
        }

        // LINE APIで動作確認（GET /v2/bot/info）
        try {
            const response = await fetch('https://api.line.me/v2/bot/info', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${store.line_channel_access_token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return NextResponse.json({
                    verified: false,
                    error: errorData.message || 'LINE APIへの接続に失敗しました',
                });
            }

            const botInfo = await response.json();

            return NextResponse.json({
                verified: true,
                channel_name: botInfo.displayName || undefined,
            });
        } catch (fetchError: any) {
            console.error('LINE API verification error:', fetchError);
            return NextResponse.json({
                verified: false,
                error: fetchError.message || 'LINE APIへの接続に失敗しました',
            });
        }
    } catch (error: any) {
        console.error('Store LINE verify error:', error);
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}







