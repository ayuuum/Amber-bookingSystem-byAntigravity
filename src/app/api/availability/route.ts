import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculateAvailableSlots, getStoreBusinessHours } from '@/lib/booking-logic';
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
        let storeQuery = supabase.from('stores').select('id, slug, settings, business_hours');
        if (storeSlug) {
            storeQuery = storeQuery.eq('slug', storeSlug);
        } else {
            return NextResponse.json({ error: 'Store identifier required' }, { status: 400 });
        }
        const { data: stores, error: storeError } = await storeQuery.limit(1);
        if (storeError || !stores || stores.length === 0) {
            console.error('Availability Debug: Store not found for slug:', storeSlug);
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }
        const store = stores[0] as any as Store;

        // 2. Calculate Service Duration
        const serviceIds = cartItems.map((i: any) => i.serviceId);
        const { data: services } = await supabase.from('services').select('id, duration_minutes').in('id', serviceIds);
        const { data: allOptions } = await supabase.from('service_options').select('id, duration_minutes').in('service_id', serviceIds);

        let totalDuration = 0;
        cartItems.forEach((item: any) => {
            const s = services?.find(svc => svc.id === item.serviceId);
            if (s) {
                totalDuration += s.duration_minutes * (item.quantity || 1);
                if (item.selectedOptions && item.selectedOptions.length > 0) {
                    item.selectedOptions.forEach((optId: string) => {
                        const opt = allOptions?.find(o => o.id === optId);
                        if (opt) totalDuration += opt.duration_minutes;
                    });
                }
            }
        });
        totalDuration += 30; // buffer

        // 3. Fetch Data for Calculation
        const targetDate = parseISO(date);
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const dayOfWeek = targetDate.getDay();

        let staffQuery = supabase.from('staff').select('id').eq('store_id', store.id).eq('is_active', true);
        if (staffId) staffQuery = staffQuery.eq('id', staffId);
        const { data: staffList } = await staffQuery;
        const validStaffIds = (staffList || []).map(s => s.id);

        if (validStaffIds.length === 0) return NextResponse.json([]);

        const { data: recurringSchedules } = await supabase
            .from('staff_schedules')
            .select('*')
            .in('staff_id', validStaffIds)
            .eq('day_of_week', dayOfWeek);

        const { data: overrides } = await supabase
            .from('staff_availability_overrides')
            .select('*')
            .in('staff_id', validStaffIds)
            .eq('target_date', dateStr);

        const shifts: any[] = [];
        validStaffIds.forEach(id => {
            const override = overrides?.find(o => o.staff_id === id);
            if (override) {
                if (override.is_available && override.start_time && override.end_time) {
                    shifts.push({ staff_id: id, start_time: `${dateStr}T${override.start_time}`, end_time: `${dateStr}T${override.end_time}` });
                }
            } else {
                const schedule = recurringSchedules?.find(s => s.staff_id === id);
                if (schedule) {
                    shifts.push({ staff_id: id, start_time: `${dateStr}T${schedule.start_time}`, end_time: `${dateStr}T${schedule.end_time}` });
                }
            }
        });

        // 4. Fetch Bookings
        const dayStart = `${dateStr}T00:00:00`;
        const dayEnd = `${dateStr}T23:59:59`;
        const { data: bookingsData } = await supabase
            .from('bookings')
            .select('*')
            .eq('store_id', store.id)
            .neq('status', 'cancelled')
            .gte('end_time', dayStart)
            .lte('start_time', dayEnd);
        const bookings = (bookingsData || []) as Booking[];

        // 5. Run Logic
        const bizHours = getStoreBusinessHours(store, targetDate);

        const allSlots = calculateAvailableSlots(
            targetDate,
            totalDuration,
            store,
            shifts as Shift[],
            bookings
        );

        // 6. Format Response
        const uniqueStartTimes = Array.from(new Set(allSlots.map((s: any) => format(s.start, 'HH:mm')))).sort();
        return NextResponse.json(uniqueStartTimes);

    } catch (error: any) {
        console.error('Availability API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
