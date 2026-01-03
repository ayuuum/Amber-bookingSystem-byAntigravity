import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Public Staff API
 * GET /api/staff/public?storeSlug=xxx
 * 
 * Returns active staff for a store (for public booking form)
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const storeSlug = searchParams.get('storeSlug');
        
        if (!storeSlug) {
            return NextResponse.json({ error: 'storeSlug is required' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Get store ID from slug
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', storeSlug)
            .single();

        if (storeError || !store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        // 2. Get staff IDs for this store
        const { data: staffStores } = await supabase
            .from('staff_stores')
            .select('staff_id')
            .eq('store_id', store.id);

        if (!staffStores || staffStores.length === 0) {
            return NextResponse.json([]);
        }

        const staffIds = staffStores.map(ss => ss.staff_id);

        // 3. Get active staff details
        const { data: staff, error: staffError } = await supabase
            .from('staff')
            .select('id, name, nomination_fee')
            .in('id', staffIds)
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (staffError) {
            return NextResponse.json({ error: staffError.message }, { status: 500 });
        }

        return NextResponse.json(staff || []);
    } catch (error: any) {
        console.error('Public Staff API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}














