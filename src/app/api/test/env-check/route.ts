import { NextResponse } from 'next/server';
import { ensureEnvValidated, getEnv } from '@/lib/env';

/**
 * 環境変数の確認用APIエンドポイント
 * GET /api/test/env-check
 */
export async function GET() {
    try {
        ensureEnvValidated();
        const env = getEnv();

        // セキュリティのため、値の一部のみ表示
        const maskValue = (value: string, showLength: number = 20): string => {
            if (value.length <= showLength) {
                return value.substring(0, 10) + '...';
            }
            return value.substring(0, showLength) + `... (${value.length}文字)`;
        };

        return NextResponse.json({
            success: true,
            message: '環境変数が正しく読み込まれています',
            env: {
                NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
                NEXT_PUBLIC_SUPABASE_ANON_KEY: maskValue(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
                SUPABASE_SERVICE_ROLE_KEY: maskValue(env.SUPABASE_SERVICE_ROLE_KEY),
                STRIPE_SECRET_KEY: maskValue(env.STRIPE_SECRET_KEY),
                NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: maskValue(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
                NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
                NODE_ENV: env.NODE_ENV,
            },
            checks: {
                supabaseUrlValid: env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://'),
                serviceRoleKeyPresent: env.SUPABASE_SERVICE_ROLE_KEY.length > 50,
                anonKeyPresent: env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 50,
                stripeSecretKeyValid: env.STRIPE_SECRET_KEY.startsWith('sk_'),
                stripePublishableKeyValid: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_'),
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            message: '環境変数の検証に失敗しました'
        }, { status: 500 });
    }
}












