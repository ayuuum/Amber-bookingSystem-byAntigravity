'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, X, Filter } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';

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

type Filters = {
    status: string;
    paymentStatus: string;
    searchQuery: string;
    sortBy: 'date' | 'amount' | 'customer';
    sortOrder: 'asc' | 'desc';
};

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>({
        status: 'all',
        paymentStatus: 'all',
        searchQuery: '',
        sortBy: 'date',
        sortOrder: 'desc',
    });
    const supabase = createClient();
    const { toast } = useToast();

    const fetchBookings = async () => {
        setLoading(true);

        try {
            const res = await fetch('/api/admin/bookings');
            const data = await res.json();

            if (!res.ok) {
                // 空のエラーオブジェクト・権限不足は正常系として扱う（予約0件と同じ）
                const errorMessage = data.error?.message || data.error || '';
                const isEmptyError = JSON.stringify(data) === '{}' || !errorMessage;
                const isPermissionDenied = typeof errorMessage === 'string' && (
                    errorMessage.includes('permission denied') ||
                    (errorMessage.includes('relation') && errorMessage.includes('does not exist')) ||
                    errorMessage.includes('Could not find')
                );
                
                if (isEmptyError || isPermissionDenied) {
                    // 正常系として空配列をセット（console.errorとtoastは出さない）
                    setBookings([]);
                    return;
                }
                
                // 本当に致命的なエラーのみconsole.errorとtoast（ネットワーク断など）
                console.error('Error fetching bookings API:', data);
                toast({
                    variant: 'destructive',
                    title: '予約データの取得に失敗しました',
                    description: errorMessage || 'APIエラーが発生しました',
                });
                return;
            }

            // 空配列は正常なレスポンスとして扱う（予約0件は正常な状態）
            if (Array.isArray(data)) {
                setBookings(data as Booking[]);
            } else {
                // 予期しない形式の場合は空配列として扱う
                console.warn('Unexpected data format from bookings API:', data);
                setBookings([]);
            }
        } catch (error: any) {
            console.error('Unexpected error fetching bookings:', error);
            toast({
                variant: 'destructive',
                title: '予期しないエラーが発生しました',
                description: error.message || '不明なエラー',
            });
        } finally {
            setLoading(false);
        }
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

        if (error) {
            console.error('Payment status update error:', error);
            toast({
                variant: 'destructive',
                title: '支払いステータスの更新に失敗しました',
                description: error.message,
            });
        } else {
            setBookings(bookings.map(b => b.id === bookingId ? { ...b, payment_status: newStatus } : b));
            toast({
                variant: 'success',
                title: '更新完了',
                description: `支払いステータスを「${newStatus === 'paid' ? '支払済' : '未払い'}」に更新しました`,
            });
        }
    };

    // フィルタリング・検索・ソート処理
    const filteredBookings = useMemo(() => {
        let result = [...bookings];

        // ステータスフィルタ
        if (filters.status !== 'all') {
            result = result.filter(b => b.status === filters.status);
        }

        // 支払い状況フィルタ
        if (filters.paymentStatus !== 'all') {
            result = result.filter(b => b.payment_status === filters.paymentStatus);
        }

        // 検索クエリ（顧客名・電話番号）
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(b => {
                const customerName = b.customers?.full_name?.toLowerCase() || '';
                const phone = b.customers?.phone?.replace(/-/g, '') || '';
                const searchPhone = filters.searchQuery.replace(/-/g, '').toLowerCase();
                return customerName.includes(query) || phone.includes(searchPhone);
            });
        }

        // ソート
        result.sort((a, b) => {
            let comparison = 0;
            switch (filters.sortBy) {
                case 'date':
                    comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
                    break;
                case 'amount':
                    comparison = (a.total_amount || 0) - (b.total_amount || 0);
                    break;
                case 'customer':
                    comparison = (a.customers?.full_name || '').localeCompare(b.customers?.full_name || '');
                    break;
            }
            return filters.sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [bookings, filters]);

    const resetFilters = () => {
        setFilters({
            status: 'all',
            paymentStatus: 'all',
            searchQuery: '',
            sortBy: 'date',
            sortOrder: 'desc',
        });
    };

    const hasActiveFilters = filters.status !== 'all' || filters.paymentStatus !== 'all' || filters.searchQuery !== '';

    if (loading) {
        return <LoadingState message="読み込み中..." />;
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold">予約台帳</h1>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/booking">
                        <Button variant="default">＋ 電話予約登録</Button>
                    </Link>
                </div>
            </div>

            {/* フィルタバー */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    {/* 検索バー */}
                    <div className="relative flex-1 w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="顧客名・電話番号で検索..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                            className="pl-10"
                        />
                    </div>

                    {/* ステータスフィルタ */}
                    <Select
                        value={filters.status}
                        onValueChange={(value) => setFilters({ ...filters, status: value })}
                    >
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="ステータス" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">すべてのステータス</SelectItem>
                            <SelectItem value="confirmed">確定</SelectItem>
                            <SelectItem value="pending">承認待ち</SelectItem>
                            <SelectItem value="pending_payment">決済待ち</SelectItem>
                            <SelectItem value="cancelled">キャンセル</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* 支払い状況フィルタ */}
                    <Select
                        value={filters.paymentStatus}
                        onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
                    >
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="支払い状況" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">すべて</SelectItem>
                            <SelectItem value="paid">支払済</SelectItem>
                            <SelectItem value="unpaid">未払い</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* ソート */}
                    <Select
                        value={`${filters.sortBy}-${filters.sortOrder}`}
                        onValueChange={(value) => {
                            const [sortBy, sortOrder] = value.split('-') as ['date' | 'amount' | 'customer', 'asc' | 'desc'];
                            setFilters({ ...filters, sortBy, sortOrder });
                        }}
                    >
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="並び順" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date-desc">日付（新しい順）</SelectItem>
                            <SelectItem value="date-asc">日付（古い順）</SelectItem>
                            <SelectItem value="amount-desc">金額（高い順）</SelectItem>
                            <SelectItem value="amount-asc">金額（低い順）</SelectItem>
                            <SelectItem value="customer-asc">顧客名（あいうえお順）</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* リセットボタン */}
                    {hasActiveFilters && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="w-full md:w-auto"
                        >
                            <X className="h-4 w-4 mr-2" />
                            リセット
                        </Button>
                    )}
                </div>

                {/* フィルタ結果表示 */}
                {hasActiveFilters && (
                    <div className="mt-4 text-sm text-muted-foreground">
                        {filteredBookings.length}件の予約が見つかりました
                    </div>
                )}
            </Card>

            <div className="space-y-4">
                {filteredBookings.length === 0 ? (
                    bookings.length === 0 ? (
                        // 予約0件時の初期設定CTA
                        <Card className="py-12">
                            <CardContent className="text-center space-y-6">
                                <div className="space-y-2">
                                    <h2 className="text-xl font-semibold">予約はまだありません</h2>
                                    <p className="text-muted-foreground">
                                        予約受付を開始するには「サービス登録」と「スタッフ登録」が必要です
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <Link href="/admin">
                                        <Button size="lg">初期設定を進める</Button>
                                    </Link>
                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                        <Link href="/admin/services" className="hover:text-foreground underline">
                                            サービスを登録
                                        </Link>
                                        <span>|</span>
                                        <Link href="/admin/staff" className="hover:text-foreground underline">
                                            スタッフを登録
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        // フィルタ結果が0件の場合
                        <EmptyState
                            title="条件に一致する予約が見つかりませんでした"
                            description="フィルタ条件を変更して再度お試しください。"
                            compact
                        />
                    )
                ) : (
                    filteredBookings.map((booking) => (
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
                                                    toast({
                                                        variant: 'success',
                                                        title: 'コピーしました',
                                                        description: 'レビュー依頼用URLをクリップボードにコピーしました',
                                                    });
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
