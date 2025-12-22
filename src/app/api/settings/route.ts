import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const settingsSchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().optional(),
    phone: z.string().optional(),
    businessHours: z.any().optional(), // Validate shape deeper if needed
    payment: z.object({
        stripe: z.object({
            publishableKey: z.string().optional(),
            secretKey: z.string().optional(),
            enabled: z.boolean().default(false),
        }).optional()
    }).optional()
});

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Authenticate & Get Store Context
        // We rely on RLS 'Owners can update own store' policy.
        // But for robust error handling, let's verify user has a store first.

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Identify Store
        // Option A: Use `auth.get_my_store_id` via RPC?
        // Option B: Query profile directly (since generic client might not have `auth` schema access easy?)
        // Let's use profile query.
        const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
        if (!profile?.store_id) return NextResponse.json({ error: 'No store linked to account' }, { status: 403 });

        const storeId = profile.store_id;

        // 2. Validate Body
        const body = await request.json();
        const validated = settingsSchema.safeParse(body);
        if (!validated.success) {
            return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
        }
        const data = validated.data;

        // 3. Prepare Update Payload
        // We need to merge settings, not overwrite entirely if we want to be safe,
        // but for MVP replacing `settings` JSON is okay if UI sends full state.
        // UI sends `payment` object. existing `settings` might have other stuff.
        // Let's fetch existing first.
        const { data: currentStore } = await supabase.from('stores').select('settings').eq('id', storeId).single();
        const currentSettings = (currentStore?.settings as any) || {};

        const newSettings = {
            ...currentSettings,
            payment: data.payment || currentSettings.payment
        };

        // 4. Execute Update
        const { error } = await supabase
            .from('stores')
            .update({
                name: data.name,
                address: data.address,
                phone: data.phone,
                business_hours: data.businessHours, // separate column
                settings: newSettings // jsonb column
            })
            .eq('id', storeId); // RLS would enforce this anyway

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Settings Update Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
