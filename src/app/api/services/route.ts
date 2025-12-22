import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { AmberErrors, errorResponse } from '@/lib/errors';

// Update to support Slug based filtering
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');
        const supabase = await createClient();

        let query = supabase.from('services').select(`
            *,
            options:service_options(*)
        `);

        if (slug) {
            // Resolve store_id from slug directly from table
            const { data: storeData, error: storeError } = await supabase
                .from('stores')
                .select('id')
                .eq('slug', slug)
                .limit(1);

            if (storeError || !storeData || storeData.length === 0) {
                return NextResponse.json({ error: 'Store not found' }, { status: 404 });
            }
            const storeId = storeData[0].id;
            query = query.eq('store_id', storeId);
        } else {
            // For MVP, if no slug, we might return empty to avoid leaking all data
            // Or return everything if that's the intention (e.g. admin listing?)
            // Let's assume slug is required for Public access.
            // If user is admin, maybe allowed? But let's stick to safe defaults.
            return NextResponse.json([]);
        }

        const { data: services, error } = await query.order('price', { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(services);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, store_id, title, duration_minutes, price, description, category } = body;

        // Validation
        if (!title || !store_id) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('タイトルと店舗IDは必須です。'));
        }

        const serviceData = {
            store_id,
            title,
            duration_minutes,
            price,
            description,
            category,
            is_active: true
        };

        let result;
        if (id) {
            // Update
            result = await supabase
                .from('services')
                .update(serviceData)
                .eq('id', id)
                .select()
                .single();
        } else {
            // Create
            // Org ID resolve (MVP) - link to the store's org
            const { data: store } = await supabase.from('stores').select('organization_id').eq('id', store_id).single();
            result = await supabase
                .from('services')
                .insert({ ...serviceData, organization_id: store?.organization_id })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        return NextResponse.json(result.data);
    } catch (error: any) {
        console.error('Service save error:', error);
        return errorResponse(AmberErrors.DATABASE_ERROR(error.message));
    }
}
