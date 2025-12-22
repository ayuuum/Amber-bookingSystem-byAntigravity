import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export async function GET() {
    try {
        const supabase = await createClient();
        const now = new Date();
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();
        const dayStart = startOfDay(now).toISOString();
        const dayEnd = endOfDay(now).toISOString();

        // 1. Sales & Booking Count (Current Month)
        const { data: monthBookings, error: monthError } = await supabase
            .from('bookings')
            .select('id, total_amount, status, created_at')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd)
            .neq('status', 'cancelled');

        if (monthError) throw monthError;

        const totalSales = monthBookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
        const totalCount = monthBookings?.length || 0;

        // 2. Pending Count
        const { count: pendingCount, error: pendingError } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (pendingError) throw pendingError;

        // 3. Top Services (All Time or Monthly? Let's do All Time for MVP due to data volume)
        // We need to count grouping by service_id in booking_items.
        // Supabase/PostgREST doesn't support easy GroupBy + Count return without RPC usually.
        // For MVP, we'll fetch booking_items within the month and aggregate in JS. 
        // Warning: Performance hit if many data.
        const { data: items } = await supabase
            .from('booking_items')
            .select(`
                quantity,
                services ( name )
            `)
            .limit(1000); // Safety limit

        const serviceStats: Record<string, number> = {};
        items?.forEach((item: any) => {
            const name = item.services?.name || 'Unknown';
            serviceStats[name] = (serviceStats[name] || 0) + item.quantity;
        });

        const topServices = Object.entries(serviceStats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 4. Recent Bookings (Limit 5)
        const { data: recentBookings } = await supabase
            .from('bookings')
            .select(`
                id, 
                total_amount, 
                created_at, 
                customers ( name ),
                services ( name ) -- Legacy fallback if items not loaded
            `)
            .order('created_at', { ascending: false })
            .limit(5);

        // 5. Today's Schedule
        const { data: todaysSchedule } = await supabase
            .from('bookings')
            .select(`
                id,
                start_time,
                total_amount,
                staff ( name ),
                customers ( name ),
                items:booking_items (
                    quantity,
                    services ( name )
                )
            `)
            .gte('start_time', dayStart)
            .lte('start_time', dayEnd)
            .neq('status', 'cancelled')
            .order('start_time', { ascending: true });

        // 6. Recent Reviews
        const { data: recentReviews } = await supabase
            .from('reviews')
            .select(`
                id,
                rating,
                comment,
                created_at,
                bookings (
                    customers ( name ),
                    booking_items ( services ( name ) )
                )
            `)
            .order('created_at', { ascending: false })
            .limit(3);


        return NextResponse.json({
            sales: { currentMonth: totalSales },
            bookings: { currentMonth: totalCount },
            pendingCount: pendingCount || 0,
            activeServicesCount: Object.keys(serviceStats).length,
            topServices,
            recentBookings: recentBookings?.map((b: any) => ({
                id: b.id,
                amount: b.total_amount,
                date: b.created_at,
                customer: b.customers?.name || 'Unknown',
                service: b.services?.name || 'Multiple Items' // Simple display
            })),
            todaysSchedule: todaysSchedule?.map((b: any) => ({
                id: b.id,
                startTime: b.start_time,
                staff: b.staff?.name || 'Unassigned',
                customer: b.customers?.name || 'Unknown',
                items: b.items?.map((i: any) => `${i.services?.name} x${i.quantity}`).join(', ')
            })),
            recentReviews: recentReviews?.map((r: any) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                date: r.created_at,
                customer: r.bookings?.customers?.name || 'Unknown',
                service: r.bookings?.booking_items?.[0]?.services?.name || 'Service'
            }))
        });

    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
