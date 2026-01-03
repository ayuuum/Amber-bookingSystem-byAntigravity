import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Slug validation: lowercase alphanumeric and hyphens only
function validateSlug(slug: string): boolean {
    return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}

// Generate slug from organization name
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, organizationName, organizationSlug } = body;

        // Validation
        if (!email || !password || !organizationName) {
            return NextResponse.json(
                { error: 'Email、パスワード、組織名は必須です。' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'パスワードは8文字以上である必要があります。' },
                { status: 400 }
            );
        }

        // Generate or validate slug
        let slug = organizationSlug || generateSlug(organizationName);
        if (!validateSlug(slug)) {
            return NextResponse.json(
                { error: '組織スラッグは3-50文字の英数字とハイフンのみ使用可能です。' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Verify service role client can be created
        let serviceClient;
        try {
            serviceClient = createServiceRoleClient();
            console.log('Service role client created successfully');
        } catch (serviceClientError: any) {
            console.error('Failed to create service role client:', serviceClientError);
            return NextResponse.json(
                {
                    error: 'サービスロールクライアントの作成に失敗しました。',
                    details: serviceClientError.message,
                    hint: 'SUPABASE_SERVICE_ROLE_KEY環境変数が正しく設定されているか確認してください。'
                },
                { status: 500 }
            );
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'ユーザー作成に失敗しました。' },
                { status: 500 }
            );
        }

        const userId = authData.user.id;

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                email: authData.user.email,
            },
            message: 'アカウントが作成されました。ログインしてセットアップを完了してください。',
        });

    } catch (error: any) {
        console.error('Signup Error:', error);
        return NextResponse.json(
            { error: error.message || '内部エラーが発生しました。' },
            { status: 500 }
        );
    }
}

