'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define types locally for now or import from supabase types and extend

// Extended Types
type BookingItemOption = {
    price: number;
    service_options: {
        name: string;
    } | null;
};

type BookingItem = {
    quantity: number;
    unit_price: number;
    subtotal: number;
    services: {
        title: string;
    } | null;
    snapshot_duration: number;
    booking_item_options: BookingItemOption[];
};

type Booking = {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    payment_status: string;
    payment_method: string | null;
    total_amount: number | null;
    notes: string | null;
    booking_items: BookingItem[];
    customers: {
        id: string;
        full_name: string;
        phone: string;
        address: string | null;
    } | null;
    staff: {
        name: string;
    } | null;
};

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchBookings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                id,
                start_time,
                end_time,
                status,
                payment_status,
                payment_method,
                total_amount,
                notes,
                customers ( full_name, phone, address ),
                staff ( name ),
                booking_items (
                    quantity,
                    unit_price,
                    subtotal,
                    services ( title ),
                    booking_item_options (
                        price,
                        service_options ( name )
                    )
                )
            `)
            .order('start_time', { ascending: false });

        if (error) {
            console.error('Error fetching bookings:', error);
        } else {
            // Transform Supabase response (arrays) to single objects for state logic
            const formattedData = (data || []).map((booking: any) => ({
                ...booking,
                customers: Array.isArray(booking.customers) ? booking.customers[0] : booking.customers,
                staff: Array.isArray(booking.staff) ? booking.staff[0] : booking.staff,
                // booking_items is already an array, just needs type assertion usually
            }));
            setBookings(formattedData as Booking[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBookings();
    }, [supabase]);

    const handlePaymentToggle = async (bookingId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
        const { error } = await supabase
            .from('bookings')
            .update({ payment_status: newStatus })
            .eq('id', bookingId);

        if (!error) {
            setBookings(bookings.map(b => b.id === bookingId ? { ...b, payment_status: newStatus } : b));
        }
    };

    if (loading) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">予約台帳</h1>
                <div className="flex gap-2">
                    <Link href="/admin/staff">
                        <Button variant="outline" size="sm">スタッフ管理</Button>
                    </Link>
                    <Link href="/admin/services">
                        <Button variant="outline" size="sm">サービス管理</Button>
                    </Link>
                    <Link href="/booking">
                        <Button variant="default">＋ 電話予約登録</Button>
                    </Link>
                </div>
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
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="font-bold text-lg">
                                                {format(new Date(booking.start_time), 'yyyy年MM月dd日 (eee)', { locale: ja })}
                                            </div>
                                            <div className="text-xl font-bold text-primary">
                                                {format(new Date(booking.start_time), 'HH:mm', { locale: ja })} 〜 {format(new Date(booking.end_time), 'HH:mm', { locale: ja })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {booking.status === 'confirmed' ? '確定' :
                                                booking.status === 'cancelled' ? 'キャンセル' : booking.status}
                                        </div>

                                        <Button
                                            size="sm"
                                            variant={booking.payment_status === 'paid' ? 'default' : 'outline'}
                                            className={booking.payment_status === 'paid' ? 'bg-blue-600 hover:bg-blue-700' : 'text-red-500 border-red-200 hover:bg-red-50'}
                                            onClick={() => handlePaymentToggle(booking.id, booking.payment_status)}
                                        >
                                            {booking.payment_status === 'paid' ? '支払済' : '未払い'}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 grid md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">お客様情報</h3>
                                    <div className="font-medium text-lg">{booking.customers?.full_name || '不明'} 様</div>
                                    <div className="text-sm">☎ {booking.customers?.phone || '-'}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        📍 {booking.customers?.address || '住所未登録'}
                                    </div>

                                    {booking.notes && (
                                        <div className="bg-yellow-50 p-2 rounded text-sm text-yellow-800 border border-yellow-100 mt-4">
                                            📝 {booking.notes}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">注文内容</h3>
                                        {/* Cart Items List */}
                                        <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                                            {booking.booking_items?.map((item, idx) => (
                                                <div key={idx} className="border-b last:border-0 pb-2 last:pb-0">
                                                    <div className="flex justify-between font-medium">
                                                        <span>{item.services?.title}</span>
                                                        <span>x {item.quantity}</span>
                                                    </div>
                                                    {item.booking_item_options && item.booking_item_options.length > 0 && (
                                                        <div className="text-xs text-gray-500 ml-2 mt-1 space-y-0.5">
                                                            {item.booking_item_options.map((opt, oIdx) => (
                                                                <div key={oIdx}>+ {opt.service_options?.name}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {(!booking.booking_items || booking.booking_items.length === 0) && (
                                                <div className="text-sm text-gray-500 italic">明細なし (旧データ)</div>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center mt-3 pt-2 border-t">
                                            <span className="font-bold">合計金額</span>
                                            <span className="font-bold text-lg text-red-600">
                                                ¥{(booking.total_amount || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">担当スタッフ</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {booking.staff?.name || '未定 (自動アサイン待ち)'}
                                            </span>
                                        </div>
                                        <div className="mt-4 pt-4 border-t">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() => {
                                                    const url = `${window.location.origin}/reviews/${booking.id}`;
                                                    navigator.clipboard.writeText(url);
                                                    alert('レビュー依頼用URLをコピーしました:\n' + url);
                                                }}
                                            >
                                                ✍️ レビュー依頼リンクをコピー
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

