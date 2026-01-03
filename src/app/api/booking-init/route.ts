import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AmberErrors, errorResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const storeSlug = searchParams.get('storeSlug');

    if (!storeSlug) {
        return errorResponse(AmberErrors.VALIDATION_ERROR('Store slug is required'));
    }

    const supabase = await createClient();

    try {
        // Fetch Store theme/settings, Services, and Staff in parallel
        const [storeRes, servicesRes, staffRes] = await Promise.all([
            supabase
                .from('stores')
                .select('id, settings')
                .eq('slug', storeSlug)
                .single(),
            supabase
                .from('services')
                .select('*, options(*)')
                .eq('is_active', true),
            supabase
                .from('profiles')
                .select('*')
                .eq('role', 'staff')
        ]);

        if (storeRes.error) {
            logger.error('Error fetching store', { error: storeRes.error, storeSlug });
            return errorResponse(AmberErrors.NOT_FOUND('店舗'));
        }

        const storeId = storeRes.data.id;

        // エラーチェック（servicesとstaffはオプショナル）
        if (servicesRes.error) {
            logger.warn('Error fetching services (non-blocking)', { error: servicesRes.error });
        }
        if (staffRes.error) {
            logger.warn('Error fetching staff (non-blocking)', { error: staffRes.error });
        }

        // Format services to match frontend expectations
        const formattedServices = servicesRes.data?.map((s: any) => ({
            ...s,
            options: s.options?.map((o: any) => ({
                ...o,
                durationMinutes: o.duration_minutes || 0
            })) || []
        })) || [];

        return NextResponse.json({
            theme: storeRes.data.settings?.theme || null,
            services: formattedServices,
            staff: staffRes.data || []
        });

    } catch (error: any) {
        logger.error('Booking Init API Error', { error, storeSlug });
        return errorResponse(AmberErrors.INTERNAL_ERROR());
    }
}
