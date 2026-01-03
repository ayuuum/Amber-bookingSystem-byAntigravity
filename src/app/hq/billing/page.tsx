"use client";

import { useEffect, useState } from 'react';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading';
import { useToast } from '@/hooks/use-toast';

interface BillingItem {
    store_id: string;
    store_name: string;
    gmv: number;
    fee: number;
    count: number;
    status: string;
}

export default function HQBillingPage() {
    const [loading, setLoading] = useState(true);
    const [billings, setBillings] = useState<BillingItem[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const { toast } = useToast();

    useEffect(() => {
        fetchBillings();
    }, [selectedMonth]);

    const fetchBillings = async () => {
        setLoading(true);
        try {
            const monthParam = format(selectedMonth, 'yyyy-MM-dd');
            const res = await fetch(`/api/hq/billing?month=${monthParam}`);
            
            if (!res.ok) {
                throw new Error('請求データの取得に失敗しました');
            }

            const data = await res.json();
            setBillings(data.billings || []);
        } catch (error: any) {
            console.error('Error fetching billings:', error);
            toast({
                title: "エラー",
                description: error.message || "請求データの取得に失敗しました",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousMonth = () => {
        setSelectedMonth(subMonths(selectedMonth, 1));
    };

    const handleNextMonth = () => {
        const now = new Date();
        if (selectedMonth < now) {
            setSelectedMonth(addMonths(selectedMonth, 1));
        }
    };

    const totalGMV = billings.reduce((sum, b) => sum + b.gmv, 0);
    const totalFee = billings.reduce((sum, b) => sum + b.fee, 0);
    const totalCount = billings.reduce((sum, b) => sum + b.count, 0);

    if (loading) {
        return <LoadingState message="請求データを読み込み中..." />;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900">請求・精算管理</h1>
                <p className="text-neutral-500 mt-2">店舗別ロイヤリティ（7%）の集計と請求書発行</p>
            </header>

            {/* 月選択 */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviousMonth}
                                className="rounded-xl"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-neutral-900">
                                    {format(selectedMonth, 'yyyy年M月', { locale: ja })}
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextMonth}
                                disabled={format(selectedMonth, 'yyyy-MM') >= format(new Date(), 'yyyy-MM')}
                                className="rounded-xl"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-200">
                            <Download className="w-4 h-4 mr-2" />
                            請求書を一括発行
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* サマリーカード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">総GMV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-neutral-900">
                            ¥{totalGMV.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">総手数料収益 (7%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">
                            ¥{totalFee.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">完了予約数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-neutral-900">
                            {totalCount.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 請求一覧 */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">
                                {format(selectedMonth, 'yyyy年M月', { locale: ja })} 請求一覧
                            </CardTitle>
                            <CardDescription className="font-medium text-slate-500 mt-1">
                                店舗別の月間売上と手数料
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            {billings.length}店舗
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {billings.length === 0 ? (
                        <div className="p-12 text-center text-neutral-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                            <p className="font-medium">この月の請求データはありません</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-neutral-50 text-neutral-500 text-sm border-b border-neutral-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">店舗名</th>
                                        <th className="px-6 py-4 text-right font-bold">完了GMV</th>
                                        <th className="px-6 py-4 text-right font-bold">本部手数料 (7%)</th>
                                        <th className="px-6 py-4 text-center font-bold">予約数</th>
                                        <th className="px-6 py-4 text-center font-bold">支払状況</th>
                                        <th className="px-6 py-4 text-center font-bold">アクション</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {billings.map((billing) => (
                                        <tr key={billing.store_id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-neutral-900">
                                                {billing.store_name}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-neutral-900">
                                                ¥{billing.gmv.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-amber-600 font-mono">
                                                ¥{billing.fee.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center text-neutral-700">
                                                {billing.count}件
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        billing.status === 'paid'
                                                            ? 'bg-green-100 text-green-700 border-green-200'
                                                            : 'bg-red-100 text-red-700 border-red-200'
                                                    }
                                                >
                                                    {billing.status === 'paid' ? '入金済' : '未入金'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium"
                                                >
                                                    <FileText className="w-4 h-4 mr-1" />
                                                    請求書表示
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
