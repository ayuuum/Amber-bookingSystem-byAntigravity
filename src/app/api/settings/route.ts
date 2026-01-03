import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, ApiContext } from '@/lib/api/middleware';
import { AmberErrors, errorResponse } from '@/lib/errors';

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

async function handler(request: NextRequest, context: ApiContext) {
    const { supabase, user } = context;

    // Verify user has a store
    if (!user.storeId) {
        return errorResponse(AmberErrors.FORBIDDEN());
    }

    const storeId = user.storeId;

    // Validate Body
    const body = await request.json();
    const validated = settingsSchema.safeParse(body);
    if (!validated.success) {
        return errorResponse(AmberErrors.VALIDATION_ERROR(validated.error.message));
    }
    const data = validated.data;

    // Prepare Update Payload
    // We need to merge settings, not overwrite entirely if we want to be safe,
    // but for MVP replacing `settings` JSON is okay if UI sends full state.
    // UI sends `payment` object. existing `settings` might have other stuff.
    // Let's fetch existing first.
    const { data: currentStore, error: fetchError } = await supabase
        .from('stores')
        .select('settings')
        .eq('id', storeId)
        .single();

    if (fetchError) {
        return errorResponse(AmberErrors.DATABASE_ERROR());
    }

    const currentSettings = (currentStore?.settings as any) || {};

    const newSettings = {
        ...currentSettings,
        payment: data.payment || currentSettings.payment
    };

    // Execute Update
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

    if (error) {
        return errorResponse(AmberErrors.DATABASE_ERROR(error.message));
    }

    return NextResponse.json({ success: true });
}

export const POST = withAuth(handler);
