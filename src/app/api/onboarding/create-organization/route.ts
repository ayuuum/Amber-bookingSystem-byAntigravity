import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // 1. Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: '認証エラー。ログインし直してください。' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { organizationName, organizationSlug } = body;

        if (!organizationName || !organizationSlug) {
            return NextResponse.json(
                { error: '組織名とスラッグは必須です。' },
                { status: 400 }
            );
        }

        const serviceClient = createServiceRoleClient();

        // 1.5. Check if profile already exists with an organization_id
        const { data: existingProfile } = await serviceClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .maybeSingle();

        if (existingProfile?.organization_id) {
            return NextResponse.json({
                success: true,
                message: '既にセットアップが完了しています。',
            });
        }

        // 2. Create organization with Service Role (bypasses RLS)
        const { data: org, error: orgError } = await serviceClient
            .from('organizations')
            .insert({
                name: organizationName,
                slug: organizationSlug,
                owner_id: user.id,
                plan_type: 'starter',
                max_stores: 1,
                max_staff: 3,
                max_house_assets: 50,
            })
            .select()
            .single();

        if (orgError) {
            if (orgError.code === '23505') {
                return NextResponse.json({ error: 'そのURLは使えません' }, { status: 409 });
            }
            return NextResponse.json(
                { error: `組織作成エラー: ${orgError.message}` },
                { status: 500 }
            );
        }

        // 3. Upsert profile with Service Role
        const { error: profileError } = await serviceClient
            .from('profiles')
            .upsert({
                id: user.id,
                organization_id: org.id,
                role: 'hq_admin',
                email: user.email,
                full_name: organizationName,
            }, {
                onConflict: 'id'
            });

        if (profileError) {
            // Cleanup: プロフィール作成に失敗した場合は、直前に作成した組織を削除して孤児化を防ぐ
            await serviceClient.from('organizations').delete().eq('id', org.id);

            return NextResponse.json(
                { error: `プロフィール設定エラー: ${profileError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            organization: org,
            message: 'セットアップが完了しました。',
        });

    } catch (error: any) {
        console.error('Onboarding Error:', error);
        return NextResponse.json(
            { error: '内部サーバーエラーが発生しました。' },
            { status: 500 }
        );
    }
}
