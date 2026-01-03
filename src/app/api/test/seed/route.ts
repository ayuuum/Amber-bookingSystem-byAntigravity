import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();

        // RPC関数を使用してシードデータを作成（RLSをバイパス）
        const { data, error } = await supabase.rpc('seed_demo_data');

        if (error) {
            // RPC関数が存在しない場合は、マイグレーションを実行するよう案内
            console.log('RPC function not found:', error);
            return NextResponse.json({ 
                error: 'RPC function seed_demo_data not found.',
                hint: 'Please run the migration file: supabase/migrations/20241224_dev_seed_data.sql in your Supabase SQL Editor, or set SUPABASE_SERVICE_ROLE_KEY in your environment variables.',
                migration_sql: 'See supabase/migrations/20241224_dev_seed_data.sql'
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Seeding complete.',
            data
        });

    } catch (error: any) {
        console.error("Seed API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function createSeedDataDirectly(supabase: any) {
    try {
        // 1. Create or get Organization
        const orgSlug = 'demo-org';
        let orgId: string;
        
        const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single();

        if (existingOrg) {
            orgId = existingOrg.id;
        } else {
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: 'デモ組織',
                    slug: orgSlug
                })
                .select()
                .single();

            if (orgError) throw new Error(`Organization Error: ${orgError.message}`);
            orgId = org.id;
        }

        // 2. Create or get Store
        const storeSlug = 'demo-store';
        let storeId: string;

        const { data: existingStore } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', storeSlug)
            .single();

        if (existingStore) {
            storeId = existingStore.id;
        } else {
            const { data: store, error: storeError } = await supabase
                .from('stores')
                .insert({
                    organization_id: orgId,
                    name: 'Amber House デモ店舗',
                    slug: storeSlug,
                    address: '東京都渋谷区',
                    phone: '03-1234-5678',
                    email: 'demo@amber-house.jp'
                })
                .select()
                .single();

            if (storeError) throw new Error(`Store Error: ${storeError.message}`);
            storeId = store.id;
        }

        // 3. Create Services
        const services = [
            { title: 'エアコンクリーニング', price: 12000, duration_minutes: 90, description: '壁掛けエアコンの徹底洗浄。深層部まで清掃し、清潔な空気環境を提供します。' },
            { title: 'キッチン・レンジフード', price: 15000, duration_minutes: 120, description: '頑固な油汚れを完全除去。換気扇の内部まで徹底的に清掃し、清潔な調理環境を実現します。' },
            { title: '浴室クリーニング', price: 10000, duration_minutes: 90, description: 'カビと水垢を極限まで除去。毎日の入浴がより快適になります。' },
            { title: '水回りセット（キッチン＋浴室）', price: 23000, duration_minutes: 180, description: 'キッチンと浴室のお得なセットプラン。まとめて清掃でさらにお得です。' },
        ];

        for (const s of services) {
            const { data: existing } = await supabase
                .from('services')
                .select('id')
                .eq('title', s.title)
                .eq('store_id', storeId)
                .single();
            
            if (!existing) {
                await supabase.from('services').insert({
                    organization_id: orgId,
                    store_id: storeId,
                    title: s.title,
                    price: s.price,
                    duration_minutes: s.duration_minutes,
                    description: s.description,
                    is_active: true
                });
            }
        }

        // 4. Create Staff
        const { data: existingStaff } = await supabase
            .from('staff')
            .select('id')
            .eq('store_id', storeId)
            .limit(1);

        if (!existingStaff || existingStaff.length === 0) {
            await supabase.from('staff').insert([
                { organization_id: orgId, store_id: storeId, name: '佐藤', is_active: true },
                { organization_id: orgId, store_id: storeId, name: '鈴木', is_active: true }
            ]);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Seeding complete.',
            data: {
                orgSlug,
                storeSlug
            }
        });
    } catch (error: any) {
        throw error;
    }
}
