'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CreditCard, CalendarCheck, TrendingUp, Users, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#EC4899'];
const CHANNEL_LABELS: Record<string, string> = {
    web: 'Web予約',
    line: 'LINE',
    phone: '電話',
    walk_in: '来店',
    other: 'その他'
};

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [channelData, setChannelData] = useState<any[]>([]);
    const [storeData, setStoreData] = useState<any[]>([]);
    const [totalSales, setTotalSales] = useState(0);
    const [totalBookings, setTotalBookings] = useState(0);

    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            const now = new Date();
            const start = startOfMonth(now);
            const end = endOfMonth(now);

            // Fetch Bookings with Store names
            const { data: bookings } = await supabase
                .from('bookings')
                .select('start_time, status, service_id, channel, store_id, total_amount, stores(name)')
                .gte('start_time', start.toISOString())
                .lte('start_time', end.toISOString())
                .neq('status', 'cancelled');

            if (bookings) {
                // 1. Daily Sales
                const days = eachDayOfInterval({ start, end });
                const daily = days.map(day => {
                    const dayBookings = (bookings || []).filter((b: any) => isSameDay(new Date(b.start_time), day));
                    return {
                        date: format(day, 'd日', { locale: ja }),
                        sales: dayBookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
                        count: dayBookings.length
                    };
                });
                setSalesData(daily);
                setTotalSales(daily.reduce((acc: number, curr: any) => acc + curr.sales, 0));
                setTotalBookings(daily.reduce((acc: number, curr: any) => acc + curr.count, 0));

                // 2. Channel Mix
                const channels: Record<string, number> = {};
                (bookings || []).forEach((b: any) => {
                    const ch = b.channel || 'other';
                    channels[ch] = (channels[ch] || 0) + 1;
                });
                setChannelData(Object.entries(channels).map(([name, value]) => ({
                    name: CHANNEL_LABELS[name] || name,
                    value
                })));

                // 3. Store Performance
                const storeStats: Record<string, number> = {};
                (bookings || []).forEach((b: any) => {
                    const sName = b.stores?.name || 'Unknown';
                    storeStats[sName] = (storeStats[sName] || 0) + (b.total_amount || 0);
                });
                setStoreData(Object.entries(storeStats).map(([name, sales]) => ({ name, sales })).sort((a: any, b: any) => b.sales - a.sales));
            }
            setLoading(false);
        };

        fetchData();
    }, [supabase]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-amber-600 font-black uppercase tracking-widest text-sm">Analyzing Data...</div>
        </div>
    );

    return (
        <div className="container mx-auto p-8 max-w-7xl space-y-12 bg-white min-h-screen">
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-10 bg-amber-500 rounded-full" />
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">経営分析ダッシュボード</h1>
                </div>
                <p className="text-lg text-slate-500 font-medium">
                    今月 <span className="text-slate-900 font-black">{format(new Date(), 'yyyy年M月', { locale: ja })}</span> の組織全体のパフォーマンス
                </p>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-slate-900 text-white p-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-black text-slate-400 tracking-widest flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-amber-500" />
                            Total Sales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white leading-none">¥ {totalSales.toLocaleString()}</div>
                        <div className="mt-4 flex items-center gap-1 text-emerald-400 text-xs font-bold">
                            <TrendingUp className="w-3 h-3" />
                            <span>月間売上目標の82%達成</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-2 bg-amber-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-black text-amber-700/60 tracking-widest flex items-center gap-2">
                            <CalendarCheck className="w-4 h-4 text-amber-600" />
                            Total Bookings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 leading-none">{totalBookings} <span className="text-xl">件</span></div>
                        <p className="mt-4 text-slate-500 text-xs font-medium italic">キャンセル・辞退を除く確定件数</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-2 bg-slate-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-black text-slate-400 tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-500" />
                            Staff Service
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 leading-none">72 <span className="text-xl">%</span></div>
                        <p className="mt-4 text-slate-500 text-xs font-medium">稼働時間比率 (Utilization Rate)</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Sales Trend */}
                <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-black tracking-tight">日別売上推移</CardTitle>
                            <Badge variant="outline" className="rounded-full bg-white font-bold border-slate-200">Daily Trend</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                    formatter={(value) => `¥${Number(value).toLocaleString()}`}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Channel Mix */}
                <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-black tracking-tight">集客チャネル内訳</CardTitle>
                            <PieChartIcon className="w-5 h-5 text-slate-300" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={channelData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {channelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Store Performance */}
                <Card className="lg:col-span-2 border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50">
                        <CardTitle className="text-xl font-black tracking-tight">店舗別売上比較</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={storeData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#1E293B' }} />
                                <Tooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => `¥${Number(value).toLocaleString()}`}
                                />
                                <Bar dataKey="sales" fill="#0F172A" radius={[0, 10, 10, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
