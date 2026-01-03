import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json(
                { error: 'トークンとパスワードは必須です。' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'パスワードは8文字以上である必要があります。' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Validate invitation
        const { data: invitation, error: inviteError } = await supabase
            .from('invitations')
            .select('*')
            .eq('token', token)
            .single();

        if (inviteError || !invitation) {
            return NextResponse.json(
                { error: '招待リンクが見つかりません。' },
                { status: 404 }
            );
        }

        if (invitation.accepted_at) {
            return NextResponse.json(
                { error: 'この招待は既に承認されています。' },
                { status: 400 }
            );
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'この招待リンクの有効期限が切れています。' },
                { status: 400 }
            );
        }

        // Check if user already exists (check profiles table)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', invitation.email)
            .single();

        if (existingProfile) {
            return NextResponse.json(
                { error: 'このメールアドレスは既に登録されています。' },
                { status: 409 }
            );
        }

        // Create user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: invitation.email,
            password,
        });

        if (authError || !authData.user) {
            return NextResponse.json(
                { error: authError?.message || 'アカウント作成に失敗しました。' },
                { status: 500 }
            );
        }

        const userId = authData.user.id;

        // Create profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                organization_id: invitation.organization_id,
                store_id: invitation.store_id || null,
                role: invitation.role,
                email: invitation.email,
            });

        if (profileError) {
            // Rollback: Delete user (admin function requires service role, so we'll log it)
            console.error('Profile creation failed, user cleanup needed:', userId);
            return NextResponse.json(
                { error: `プロフィール作成エラー: ${profileError.message}` },
                { status: 500 }
            );
        }

        // Mark invitation as accepted
        await supabase
            .from('invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('id', invitation.id);

        return NextResponse.json({
            success: true,
            message: 'アカウントが正常に作成されました。',
        });

    } catch (error: any) {
        console.error('Invite Accept Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}



