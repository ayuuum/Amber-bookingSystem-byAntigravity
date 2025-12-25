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

        // Check if slug already exists (using service role to bypass RLS)
        const { data: existingOrg, error: checkError } = await serviceClient
            .from('organizations')
            .select('id')
            .eq('slug', slug)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing organization:', checkError);
            return NextResponse.json(
                { 
                    error: '組織スラッグの確認中にエラーが発生しました。',
                    details: checkError.message,
                    code: checkError.code
                },
                { status: 500 }
            );
        }

        if (existingOrg) {
            return NextResponse.json(
                { error: 'この組織スラッグは既に使用されています。別のスラッグを選択してください。' },
                { status: 409 }
            );
        }

        // 1. Create user in Supabase Auth
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

        // 2. Create organization using service role client (bypasses RLS)
        // This is necessary because the user is not yet authenticated in the session
        console.log('Creating organization with service role client...');
        console.log('Organization data:', {
            name: organizationName,
            slug: slug,
            owner_id: userId,
            plan_type: 'starter',
            max_stores: 1,
            max_staff: 3,
            max_house_assets: 50,
        });
        
        const { data: org, error: orgError } = await serviceClient
            .from('organizations')
            .insert({
                name: organizationName,
                slug: slug,
                owner_id: userId,
                plan_type: 'starter', // Default plan
                max_stores: 1,
                max_staff: 3,
                max_house_assets: 50,
            })
            .select()
            .single();

        if (orgError) {
            console.error('Organization creation error:', orgError);
            console.error('Error details:', {
                message: orgError.message,
                details: orgError.details,
                hint: orgError.hint,
                code: orgError.code
            });
            
            // Provide more detailed error information
            let errorMessage = `組織作成エラー: ${orgError.message}`;
            let errorHint = '';
            
            if (orgError.code === '42501' || orgError.message.includes('permission denied')) {
                errorHint = 'データベースの権限設定を確認してください。マイグレーションファイル（20241226_fix_signup_rls.sql と 20241226_fix_organizations_schema.sql）が実行されているか確認してください。';
            } else if (orgError.code === '23505' || orgError.message.includes('duplicate')) {
                errorHint = 'この組織スラッグは既に使用されています。別のスラッグを選択してください。';
            } else if (orgError.message.includes('column') && orgError.message.includes('does not exist')) {
                errorHint = 'データベーススキーマが最新でない可能性があります。マイグレーションファイル（20241226_fix_organizations_schema.sql）を実行してください。';
            }
            
            return NextResponse.json(
                { 
                    error: errorMessage,
                    details: orgError.details || null,
                    hint: errorHint || orgError.hint || null,
                    code: orgError.code || null
                },
                { status: 500 }
            );
        }

        // 3. Create profile with hq_admin role using service role client
        console.log('Creating profile with service role client...');
        const { error: profileError } = await serviceClient
            .from('profiles')
            .insert({
                id: userId,
                organization_id: org.id,
                role: 'hq_admin',
                email: email,
                full_name: organizationName, // Default to org name, can be changed later
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
            console.error('Error details:', {
                message: profileError.message,
                details: profileError.details,
                hint: profileError.hint,
                code: profileError.code
            });
            
            // Rollback: Delete org (user cleanup will be handled by admin if needed)
            try {
                await serviceClient.from('organizations').delete().eq('id', org.id);
                console.log('Organization rollback successful');
            } catch (deleteError) {
                console.error('Failed to rollback organization:', deleteError);
            }
            
            return NextResponse.json(
                { 
                    error: `プロフィール作成エラー: ${profileError.message}`,
                    details: profileError.details || null,
                    hint: profileError.hint || null,
                    code: profileError.code || null
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: userId,
                email: authData.user.email,
            },
            organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
            },
            message: 'アカウントが正常に作成されました。',
        });

    } catch (error: any) {
        console.error('Signup Error:', error);
        return NextResponse.json(
            { error: error.message || '内部エラーが発生しました。' },
            { status: 500 }
        );
    }
}

