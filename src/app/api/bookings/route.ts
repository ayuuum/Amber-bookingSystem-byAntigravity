import { createClient } from '@/lib/supabase/server';
import { bookingSchema } from '@/components/features/booking/schema';
import { sendBookingConfirmationLine } from '@/lib/line/notifications';
import { syncBookingToGoogleCalendar } from '@/lib/google/sync';
import { getPlanAccess } from '@/lib/plan/access';
import { AmberErrors, errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// ... imports remain same ...

// Define extended schema to include cartItems
const cartItemSchema = z.object({
    serviceId: z.string(),
    quantity: z.number().min(1),
    selectedOptions: z.array(z.string()).optional()
});

const apiBookingSchema = bookingSchema.extend({
    date: z.coerce.date(),
    cartItems: z.array(cartItemSchema).optional(), // Optional for legacy? No, make required for new flow
});

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();

        // Validate input data
        const validatedData = apiBookingSchema.parse(body);
        const { cartItems } = validatedData;

        if (!cartItems || cartItems.length === 0) {
            return errorResponse(AmberErrors.VALIDATION_ERROR('カートにサービスが入っていません。'));
        }

        // 1. Get Store ID from Slug
        const slug = (body as any).slug; // Extract slug from payload
        if (!slug) return errorResponse(AmberErrors.VALIDATION_ERROR('店舗情報が指定されていません。'));

        // Use RPC or direct select if RPC not available (for MVP select is fine if RLS allows or we use admin client)
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, organization_id')
            .eq('slug', slug)
            .single();

        if (storeError || !store) return errorResponse(AmberErrors.NOT_FOUND('店舗'));
        const storeId = store.id;
        const orgId = store.organization_id;

        // 2. Service Area Validation
        const { data: areas } = await supabase
            .from('service_areas')
            .select('prefecture, city')
            .eq('store_id', storeId);

        if (areas && areas.length > 0) {
            const address = validatedData.customerAddress;
            const isCovered = areas.some(area => address.includes(area.prefecture) && address.includes(area.city));
            if (!isCovered) {
                return NextResponse.json({ error: 'Selected address is out of service area.' }, { status: 400 });
            }
        }

        // 3. Calculate Totals (Duration & Price) from DB
        // Fetch all involved services & options to be safe (trust DB, not client)
        // IDs:
        const serviceIds = cartItems.map(i => i.serviceId);
        const optionIds = cartItems.flatMap(i => i.selectedOptions || []);

        // Parallel Fetch
        const [servicesRes, optionsRes] = await Promise.all([
            supabase.from('services').select('*').in('id', serviceIds),
            // Assuming we have service_options table. 
            // If not created yet in dev env, this will fail. 
            // We MUST assume migration `20241217_phase3_cart_system` is applied.
            optionIds.length > 0 ? supabase.from('service_options').select('*').in('id', optionIds) : Promise.resolve({ data: [] })
        ]);

        const dbServices = servicesRes.data || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbOptions = (optionsRes as any).data || [];

        let totalDurationMinutes = 0;
        let totalAmount = 0;
        const travelPadding = 30; // One travel padding per booking event

        // Calculation Loop
        for (const item of cartItems) {
            const service = dbServices.find(s => s.id === item.serviceId);
            if (!service) throw new Error(`Service ${item.serviceId} not found`);

            // Service Duration
            const serviceDuration = item.quantity * service.duration_minutes; // e.g. 2 ACs = 2 x 60m? Yes.
            // Service Buffer (Once per service type? Or per unit? Usually per unit for cleaning)
            const buffer = item.quantity * (service.buffer_minutes || 0);

            // Service Price
            const itemPrice = item.quantity * service.price;

            // Options
            let optionsDuration = 0;
            let optionsPrice = 0;
            if (item.selectedOptions) {
                for (const optId of item.selectedOptions) {
                    const opt = dbOptions.find((o: any) => o.id === optId);
                    if (opt) {
                        // Options apply to ALL units in this item line? 
                        // Our UI assumes `selectedOptions` is per line item (quantity).
                        // e.g. 2 ACs -> select Coating -> 2 Coatings involved.
                        // So price is quantity * option_price
                        optionsPrice += item.quantity * opt.price;
                        optionsDuration += item.quantity * opt.duration_minutes; // Using Snake Case in DB potentially? Check migration. 
                        // Migration said `duration_minutes integer`.
                    }
                }
            }

            totalDurationMinutes += serviceDuration + buffer + optionsDuration;
            totalAmount += itemPrice + optionsPrice;
        }

        totalDurationMinutes += travelPadding; // Add travel once at end

        // 4. Calculate Times
        const startTime = validatedData.date;
        const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60000);

        // 5. Staff Assignment
        const dayOfWeek = startTime.getDay();
        const { data: candidates } = await supabase
            .from('staff_schedules')
            .select('staff_id')
            .eq('day_of_week', dayOfWeek);

        // Simple assignment fallback
        let assignedStaffId: string | null = null;
        if (candidates && candidates.length > 0) {
            const shuffled = candidates.sort(() => 0.5 - Math.random());
            assignedStaffId = shuffled[0].staff_id;
        } else {
            const { data: anyStaff } = await supabase.from('staff').select('id').eq('is_active', true).limit(1);
            if (anyStaff) assignedStaffId = anyStaff[0].id;
        }

        // NOTE: Customer creation is now handled by the RPC (create_booking_secure)
        // The RPC performs upsert based on phone number within the store context
        // This eliminates duplicate logic and ensures consistency

        // ... (validation logic remains) ...

        // 7. Call Secure RPC
        // We pass the validated data to the Postgres Function.
        // The Function runs with Security Definer, allowing it to Insert even if Anon RLS is strict.

        // Construct Payload for RPC
        const rpcPayload = {
            slug_input: slug,
            customer_name: validatedData.customerName,
            customer_phone: validatedData.customerPhone,
            customer_email: validatedData.customerEmail || '',
            customer_address: validatedData.customerAddress,
            booking_date: validatedData.date.toISOString(),
            cart_items: cartItems.map(item => ({
                serviceId: item.serviceId,
                quantity: item.quantity,
                options: item.selectedOptions || []
            }))
        };

        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_booking_secure', rpcPayload);

        if (rpcError) {
            console.error('RPC Error:', rpcError);
            throw rpcError;
        }

        const bookingId = (rpcResult as any).bookingId;

        // Update payment method & get full info for notification
        const { data: booking } = await supabase
            .from('bookings')
            .update({ payment_method: validatedData.paymentMethod })
            .eq('id', bookingId)
            .select('*, customers(*), booking_items(*, services(*))')
            .single();

        // Plan Guard: Check Feature Access (LINE & Google Calendar)
        const planAccess = await getPlanAccess(orgId);

        // If on_site, send LINE notification immediately (Growth+ only)
        if (validatedData.paymentMethod === 'on_site' && booking?.customers?.line_user_id && planAccess.canUseLine) {
            await sendBookingConfirmationLine(booking.customers.line_user_id, booking);
        }

        // Also Sync to Google Calendar (Growth+ only)
        if (booking?.staff_id && planAccess.canUseGoogleCalendar) {
            const { data: staff } = await supabase.from('staff').select('*').eq('id', booking.staff_id).single();
            if (staff?.google_refresh_token) {
                const googleEventId = await syncBookingToGoogleCalendar(staff, booking);
                if (googleEventId) {
                    await supabase.from('bookings').update({ google_event_id: googleEventId }).eq('id', bookingId);
                }
            }
        }

        return NextResponse.json(rpcResult);

    } catch (error: any) {
        console.error('Booking API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
