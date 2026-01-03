import { NextResponse } from 'next/server';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const location = {
        type: 'unknown',
        url: supabaseUrl || 'Not set',
        isLocal: false,
        isRemote: false,
        details: {}
    };

    if (supabaseUrl) {
        // ローカルSupabaseのURLパターンをチェック
        if (supabaseUrl.includes('localhost') || 
            supabaseUrl.includes('127.0.0.1') || 
            supabaseUrl.includes(':54321') ||
            supabaseUrl.includes(':54322')) {
            location.type = 'local';
            location.isLocal = true;
            location.details = {
                description: 'ローカルSupabase（Dockerコンテナ）',
                databasePath: '通常は ~/.supabase または Dockerボリューム内',
                accessMethod: 'Supabase CLI または Docker',
                note: 'ローカル開発環境で実行されています'
            };
        } else if (supabaseUrl.includes('supabase.co')) {
            location.type = 'remote';
            location.isRemote = true;
            location.details = {
                description: 'リモートSupabase（クラウド）',
                databasePath: 'SupabaseクラウドのPostgreSQLデータベース',
                accessMethod: 'Supabase Dashboard または API',
                region: 'Supabaseのリージョン設定による',
                note: 'クラウド上でホストされています'
            };
        }
    }

    return NextResponse.json({
        location,
        environment: {
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            hasServiceRoleKey: !!serviceRoleKey,
            urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not set'
        },
        instructions: {
            local: {
                checkDatabase: 'Dockerコンテナ内のPostgreSQLデータベースを確認',
                command: 'docker ps | grep supabase',
                dataLocation: '~/.supabase または Dockerボリューム'
            },
            remote: {
                checkDatabase: 'Supabase Dashboard > Database で確認',
                url: 'https://app.supabase.com',
                dataLocation: 'SupabaseクラウドのPostgreSQLインスタンス'
            }
        }
    });
}














