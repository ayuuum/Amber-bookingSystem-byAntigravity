"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Store, Calendar, DollarSign } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface HQAnalytics {
    summary: {
        total_sales: number;
        total_bookings: number;
        completed_rate: number;
        active_stores: number;
    };
    store_ranking: Array<{
        id: string;
        name: string;
        bookings?: Array<{ count?: number }>;
        total_sales?: number;
    }>;
}

export default function HQDashboard() {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<HQAnalytics | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/hq/analytics');
            
            if (!res.ok) {
                throw new Error('分析データの取得に失敗しました');
            }

            const data = await res.json();
            setAnalytics(data);
        } catch (error: any) {
            console.error('Error fetching analytics:', error);
            toast({
                title: "エラー",
                description: error.message || "分析データの取得に失敗しました",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingState message="分析データを読み込み中..." />;
    }

    if (!analytics) {
        return (
            <div className="p-8 text-center text-neutral-500">
                データが取得できませんでした
            </div>
        );
    }

    const { summary, store_ranking } = analytics;
    const platformFee = Math.floor(summary.total_sales * 0.07); // 7% 手数料

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900">本部ダッシュボード</h1>
                <p className="text-neutral-500 mt-2">全店舗の稼働状況と売上サマリー</p>
            </header>

            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            総売上 (GMV)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-neutral-900">
                            ¥{summary.total_sales.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            全店舗合計
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-amber-600" />
                            手数料収益 (7%)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">
                            ¥{platformFee.toLocaleString()}
                        </div>
                        <div className="text-xs text-neutral-400 mt-2">
                            プラットフォーム手数料
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            アクティブ店舗数
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-neutral-900">
                            {summary.active_stores}
                </div>
                        <div className="text-xs text-neutral-400 mt-2">
                            稼働中店舗
                </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            月間予約数
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-neutral-900">
                            {summary.total_bookings.toLocaleString()}
                </div>
                        <div className="text-xs text-neutral-400 mt-2">
                            完了率: {summary.completed_rate.toFixed(1)}%
                </div>
                    </CardContent>
                </Card>
            </div>

            {/* 店舗ランキング */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">店舗別パフォーマンス</CardTitle>
                            <CardDescription className="font-medium text-slate-500 mt-1">
                                全店舗の売上と予約数ランキング
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            {store_ranking.length}店舗
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {store_ranking.length === 0 ? (
                        <div className="p-12 text-center text-neutral-500">
                            <Store className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                            <p className="font-medium">店舗データがありません</p>
                </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-neutral-50">
                                        <TableHead className="font-bold">順位</TableHead>
                                        <TableHead className="font-bold">店舗名</TableHead>
                                        <TableHead className="text-right font-bold">月間売上</TableHead>
                                        <TableHead className="text-right font-bold">予約数</TableHead>
                                        <TableHead className="text-center font-bold">ステータス</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {store_ranking.map((store, index) => {
                                        // 簡易的な売上計算（実際のAPI実装に合わせて調整が必要）
                                        const sales = store.total_sales || 0;
                                        const bookingCount = store.bookings?.[0]?.count || 0;
                                        
                                        return (
                                            <TableRow key={store.id} className="hover:bg-neutral-50">
                                                <TableCell className="font-bold text-neutral-500">
                                                    #{index + 1}
                                                </TableCell>
                                                <TableCell className="font-medium text-neutral-900">
                                                    {store.name}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-neutral-900">
                                                    ¥{sales.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right text-neutral-700">
                                                    {bookingCount.toLocaleString()}件
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            sales > 2000000
                                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                                : sales > 1000000
                                                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                                        }
                                                    >
                                                        {sales > 2000000 ? '優良' : sales > 1000000 ? '標準' : '要改善'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
            </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
