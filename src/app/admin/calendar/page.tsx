"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";

type Booking = {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    customers: { name: string } | null;
    staff: { name: string } | null;
    booking_items: {
        services: { name: string } | null;
    }[];
};

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    start_time,
                    end_time,
                    status,
                    customers ( name ),
                    staff ( name ),
                    booking_items (
                        services ( name )
                    )
                `)
                .neq('status', 'cancelled');

            if (data) {
                // Transform data if needed, or keep as is.
                // Supabase returns arrays for relations, we might need to flatten or handle in render.
                const formatted = data.map((b: any) => ({
                    ...b,
                    customers: Array.isArray(b.customers) ? b.customers[0] : b.customers,
                    staff: Array.isArray(b.staff) ? b.staff[0] : b.staff,
                }));
                setBookings(formatted);
            }
            setLoading(false);
        };

        fetchBookings();
    }, [supabase]);

    // Create array of Dates for the calendar modifier
    const bookedDates = bookings.map(b => new Date(b.start_time));

    // Filter bookings for the selected date
    const selectedDateBookings = date
        ? bookings.filter(b => isSameDay(new Date(b.start_time), date))
        : [];

    // Sort by time
    selectedDateBookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return (
        <div className="p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">カレンダー</h2>
                <p className="text-muted-foreground">スケジュールと空き状況を確認します。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>日付を選択</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                            modifiers={{
                                booked: bookedDates
                            }}
                            modifiersStyles={{
                                booked: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>{date ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日のスケジュール` : "日付を選択してください"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {loading ? (
                                <p>Loading...</p>
                            ) : selectedDateBookings.length > 0 ? (
                                selectedDateBookings.map(booking => (
                                    <div key={booking.id} className="p-4 border rounded-lg bg-slate-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-lg">
                                                {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                                                }`}>
                                                {booking.status === 'confirmed' ? '確定済み' : booking.status === 'pending' ? '承認待ち' : booking.status}
                                            </span>
                                        </div>
                                        <p className="font-medium">{booking.customers?.name || '顧客名なし'}</p>
                                        <p className="text-sm text-gray-500">
                                            担当: {booking.staff?.name || '未定'} /
                                            内容: {booking.booking_items.map(i => i.services?.name).join(', ') || '詳細なし'}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 italic">この日の予約はありません。</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

