'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define types locally for now or import from supabase types and extend
type BookingWithDetails = {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    service: {
        name: string;
        price: number;
    } | null; // Join result might be array or object depending on query
    customer: {
        name: string;
        phone: string;
        address: string | null;
    } | null;
    staff: {
        name: string;
    } | null;
};

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
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
                    notes,
                    services ( name, price ),
                    customers ( name, phone, address ),
                    staff ( name )
                `)
                .order('start_time', { ascending: false });

            if (error) {
                console.error('Error fetching bookings:', error);
                // alert('予約データの取得に失敗しました'); // Alert in useEffect might cause issues in some environments or strict mode
            } else {
                setBookings(data as unknown as BookingWithDetails[]);
            }
            setLoading(false);
        };

        fetchBookings();
    }, [supabase]);

    if (loading) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">予約台帳</h1>
                <Link href="/booking">
                    <Button variant="default">＋ 電話予約登録</Button>
                </Link>
            </div>

            <div className="space-y-4">
                {bookings.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        予約はまだありません。
                    </div>
                ) : (
                    bookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/50 pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-lg">
                                            {format(new Date(booking.start_time), 'yyyy年MM月dd日 (eee)', { locale: ja })}
                                        </div>
                                        <div className="text-xl font-bold text-primary">
                                            {format(new Date(booking.start_time), 'HH:mm', { locale: ja })} 〜 {format(new Date(booking.end_time), 'HH:mm', { locale: ja })}
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {booking.status === 'confirmed' ? '確定' :
                                            booking.status === 'cancelled' ? 'キャンセル' : booking.status}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 grid md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">お客様情報</h3>
                                    <div className="font-medium text-lg">{booking.customer?.name || '不明'} 様</div>
                                    <div className="text-sm">☎ {booking.customer?.phone || '-'}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        📍 {booking.customer?.address || '住所未登録'}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">サービス内容</h3>
                                        <div>{booking.service?.name}</div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">担当スタッフ</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {booking.staff?.name || '未定 (自動アサイン待ち)'}
                                            </span>
                                        </div>
                                    </div>
                                    {booking.notes && (
                                        <div className="bg-yellow-50 p-2 rounded text-sm text-yellow-800 border border-yellow-100">
                                            📝 {booking.notes}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
