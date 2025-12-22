import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculateAvailableSlots } from '@/lib/booking-logic';
import { format, parseISO } from 'date-fns';
import { Booking, Shift, Store } from '@/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { date, cartItems, storeSlug, organizationSlug, staffId } = body;

        // Fallback for legacy calls (if any)
        if (!cartItems && body.serviceId) {
            cartItems = [{ serviceId: body.serviceId, quantity: 1 }];
        }

        if (!date || !cartItems || cartItems.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Resolve Store
        // Ideally we search by org slug + store slug, or just store slug if unique enough or passed directly.
        // For v1.1, let's assume storeSlug is unique or we can find it.
        // Actually, schema has store.slug.
        // Let's query store with Organization info to be safe or just store.

        let storeQuery = supabase.from('stores').select('*');
        if (storeSlug) {
            storeQuery = storeQuery.eq('slug', storeSlug);
        } else {
            // If no slug, maybe we need ID? 
            return NextResponse.json({ error: 'Store identifier required' }, { status: 400 });
        }

        const { data: stores, error: storeError } = await storeQuery.limit(1);
        if (storeError || !stores || stores.length === 0) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }
        const store = stores[0] as Store;

        // 2. Calculate Service Duration (including options)
        const serviceIds = cartItems.map((i: any) => i.serviceId);
        const { data: services } = await supabase.from('services').select('id, duration_minutes').in('id', serviceIds);

        // Fetch all potential options for these services to get their durations
        const { data: allOptions } = await supabase.from('service_options').select('id, duration_minutes').in('service_id', serviceIds);

        let totalDuration = 0;
        cartItems.forEach((item: any) => {
            const s = services?.find(svc => svc.id === item.serviceId);
            if (s) {
                // Base service duration
                totalDuration += s.duration_minutes * (item.quantity || 1);

                // Options duration
                if (item.selectedOptions && item.selectedOptions.length > 0) {
                    item.selectedOptions.forEach((optId: string) => {
                        const opt = allOptions?.find(o => o.id === optId);
                        if (opt) {
                            totalDuration += opt.duration_minutes;
                        }
                    });
                }
            }
        });

        // Add buffer/travel time (e.g. 30 min fixed for now - from PRD 12-1)
        totalDuration += 30;

        // 3. Fetch Data for Calculation
        const targetDate = parseISO(date); // assumes YYYY-MM-DD
        const dateStr = format(targetDate, 'yyyy-MM-dd'); // ensure format

        // Shifts
        // Fetch shifts for this store on this date
        // Note: shifts has start_time/end_time as timestamptz.
        // We need shifts that overlap with the day.
        // Actually, simple query: start_time >= dayStart AND start_time < dayEnd
        const dayStart = `${dateStr}T00:00:00`;
        const dayEnd = `${dateStr}T23:59:59`;

        let shiftsQuery = supabase
            .from('shifts')
            .select('*')
            .eq('store_id', store.id)
            .gte('end_time', dayStart)
            .lte('start_time', dayEnd)
            .eq('is_published', true);

        if (staffId) {
            shiftsQuery = shiftsQuery.eq('staff_id', staffId);
        }

        const { data: shiftsData } = await shiftsQuery;
        const shifts = (shiftsData || []) as Shift[];

        // Bookings
        const { data: bookingsData } = await supabase
            .from('bookings')
            .select('*')
            .eq('store_id', store.id)
            .neq('status', 'cancelled')
            .gte('end_time', dayStart)
            .lte('start_time', dayEnd);

        const bookings = (bookingsData || []) as Booking[];

        // 4. Run Logic
        const allSlots = calculateAvailableSlots(
            targetDate,
            totalDuration,
            store,
            shifts,
            bookings
        );

        // 5. Format Response
        // Return unique start times
        const uniqueStartTimes = Array.from(new Set(allSlots.map(s => format(s.start, 'HH:mm')))).sort();

        return NextResponse.json(uniqueStartTimes);

    } catch (error: any) {
        console.error('Availability API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
