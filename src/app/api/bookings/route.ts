import { createClient } from '@/lib/supabase/server';
import { bookingSchema } from '@/components/booking/schema';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();

        // specific schema for API that handles string -> Date coercion
        const apiBookingSchema = bookingSchema.extend({
            date: z.coerce.date(),
        });

        // Validate input data
        const validatedData = apiBookingSchema.parse(body);

        // Get current user (if logged in) for customer_id
        const { data: { user } } = await supabase.auth.getUser();

        // TODO: Retrieve store_id and service details dynamically.
        // For MVP, we might need to look up the service to get the store_id and duration.
        // 1. Get Store ID
        const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('id')
            .limit(1)
            .single();

        if (storeError || !storeData) {
            return NextResponse.json({ error: 'Store not found' }, { status: 500 });
        }
        const storeId = storeData.id;

        // 2. Staff Auto-Assignment
        const { data: staffList } = await supabase
            .from('staff')
            .select('*')
            .eq('is_active', true)
            .eq('store_id', storeId);

        if (!staffList || staffList.length === 0) {
            // Fallback if no staff in DB yet (for testing)
            console.warn('No staff found. Proceeding without staff assignment.');
        }

        // Mock Round Robin or Random assignment
        const assignedStaff = staffList && staffList.length > 0
            ? staffList[Math.floor(Math.random() * staffList.length)]
            : null;

        // 2. Customer Lookup or Creation (Guest Booking)
        // Check if customer exists by phone
        let customerId: string | null = null;

        // For Phase 0, we treat phone as unique identifier
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', validatedData.customerPhone!) // Phone is mandatory for guest
            .single();

        if (existingCustomer) {
            customerId = existingCustomer.id;
        } else {
            // Create new customer
            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert({
                    name: validatedData.customerName,
                    phone: validatedData.customerPhone!,
                    store_id: storeId, // TODO: fix
                    notes: validatedData.customerAddress, // Initial notes from address? OR use address field
                    address: validatedData.customerAddress
                })
                .select()
                .single();

            if (createError) {
                console.error('Customer Creation Error:', createError);
                return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 });
            }
            customerId = newCustomer.id;
        }

        // We need to fetch service details to calculate end_time and get store_id
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('id', validatedData.serviceId)
            .single();

        if (serviceError || !service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 400 });
        }

        const endTime = new Date(validatedData.date.getTime() + service.duration_minutes * 60000);

        // 3. Insert Booking (Confirmed immediately)
        const { data, error } = await supabase
            .from('bookings')
            .insert({
                store_id: storeId,
                customer_id: customerId,
                staff_id: assignedStaff?.id || null,
                service_id: validatedData.serviceId,
                start_time: validatedData.date.toISOString(), // Start Time
                end_time: endTime.toISOString(),
                status: 'confirmed', // Phase 0: Immediate confirmation
                notes: validatedData.notes,
                // customer_name/email/phone fields in bookings table are redundant if we have customers table, 
                // but good for snapshot. schema might have changed?
                // logical: use customers table relation.
            })
            .select()
            .single();

        if (error) {
            console.error('Database Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Send LINE Notification if customer_id looks like a LINE user ID (Supabase Auth usually uses UUID, 
        // but if we link LINE, we need to store the provider token or LINE User ID somewhere.
        // However, Supabase Auth User ID != LINE User ID. 
        // We need to fetch the LINE User ID from `identities` table or `user_metadata` if stored.
        // For now, assuming user.user_metadata might contain 'sub' or similar if using LINE provider properly.
        // BUT, standard Supabase Auth doesn't expose LINE User ID easily in session without custom mapping.
        // We will attempt to send if we have a way. 
        // Actually, let's look at user metadata. provider_id is usually there.
        // For MVP, if we can't find it, we skip.

        // NOTE: This assumes we can get LINE User ID. 
        // If Supabase handles it, `user.identities` has `id` which is the LINE User ID.
        const identities = user?.identities;
        const lineIdentity = identities?.find(id => id.provider === 'line');

        if (lineIdentity && lineIdentity.id) {
            const { sendLineMessage } = await import('@/lib/line/messaging');
            const formattedDate = new Date(validatedData.date).toLocaleDateString('ja-JP');
            const message = `予約が確定しました。\n\n日時: ${formattedDate} ${validatedData.timeSlot}\nサービス: ${validatedData.serviceId}\n\nご来店をお待ちしております。`;

            await sendLineMessage(lineIdentity.id, [{ type: 'text', text: message }]);
        }

        return NextResponse.json({ success: true, booking: data });

    } catch (error) {
        if (error instanceof z.ZodError) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return NextResponse.json({ error: 'Validation failed', details: (error as any).errors }, { status: 400 });
        }
        console.error('Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
