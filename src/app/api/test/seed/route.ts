import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Create Store
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .upsert({
                name: 'Amber House Main Store',
                address: 'Tokyo',
                phone: '03-1234-5678'
            })
            .select()
            .single();

        if (storeError) throw new Error(`Store Error: ${storeError.message}`);

        // 2. Create Services (Let DB assign UUIDs)
        const services = [
            { name: 'エアコンクリーニング', price: 12000, duration_minutes: 90, description: '壁掛けエアコンの徹底洗浄。' },
            { name: 'キッチン・レンジフード', price: 15000, duration_minutes: 120, description: '油汚れの除去と除菌。' },
            { name: '浴室クリーニング', price: 10000, duration_minutes: 90, description: 'カビと水垢の除去。' },
            { name: '水回りセット（キッチン＋浴室）', price: 23000, duration_minutes: 180, description: 'キッチンと浴室のお得なセット。' },
        ];

        // Delete existing to avoid duplicates if running multiple times (for dev)
        // await supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 

        for (const s of services) {
            // Check if exists by name
            const { data: existing } = await supabase.from('services').select('id').eq('name', s.name).single();
            if (!existing) {
                await supabase.from('services').insert({
                    store_id: store.id,
                    name: s.name,
                    price: s.price,
                    duration_minutes: s.duration_minutes,
                    description: s.description
                });
            }
        }

        // 3. Create Staff
        const { error: staffError } = await supabase.from('staff').insert([
            { store_id: store.id, name: '佐藤 (Staff)', is_active: true },
            { store_id: store.id, name: '鈴木 (Staff)', is_active: true }
        ]);

        return NextResponse.json({ success: true, message: 'Seeding complete.' });

    } catch (error: any) {
        console.error("Seed API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
