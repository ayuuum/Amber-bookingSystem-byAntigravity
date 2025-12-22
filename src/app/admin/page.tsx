"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DollarSign, Users, CalendarCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

type DashboardStats = {
    sales: { currentMonth: number };
    bookings: { currentMonth: number };
    pendingCount: number;
    activeServicesCount: number;
    topServices: { name: string, count: number }[];
    recentBookings: {
        id: string;
        amount: number;
        date: string;
        customer: string;
        service: string;
    }[];
    recentReviews: {
        id: string;
        rating: number;
        comment: string;
        date: string;
        customer: string;
        service: string;
    }[];
    todaysSchedule: {
        id: string;
        startTime: string;
        staff: string;
        customer: string;
        items: string;
    }[];
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [planUsage, setPlanUsage] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, planRes] = await Promise.all([
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/plan/usage')
                ]);
                const statsData = await statsRes.json();
                const planData = await planRes.json();

                if (!statsData.error) setStats(statsData);
                if (!planData.error) setPlanUsage(planData);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center">Dashboard Loading...</div>;
    }

    if (!stats) return <div className="p-8">Error loading data.</div>;

    const topServiceName = stats.topServices[0]?.name || "なし";

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
                    <p className="text-muted-foreground">ビジネスのパフォーマンス概要。</p>
                </div>
                {planUsage && (
                    <Card className="w-80 border-amber-200 bg-amber-50/30">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold">
                                プラン: <span className="capitalize text-amber-600">{planUsage.planType}</span>
                            </CardTitle>
                            {planUsage.planType === 'starter' && (
                                <Link href="/admin/settings?tab=billing">
                                    <Button size="sm" variant="outline" className="h-7 text-[10px] border-amber-500 text-amber-600 hover:bg-amber-100">
                                        UPGRADE
                                    </Button>
                                </Link>
                            )}
                        </CardHeader>
                        <CardContent className="py-2 px-4 space-y-2">
                            <div className="flex justify-between text-[11px]">
                                <span>店舗数</span>
                                <span className={planUsage.limits.stores.current >= planUsage.limits.stores.limit ? "text-red-500 font-bold" : ""}>
                                    {planUsage.limits.stores.current} / {planUsage.limits.stores.limit}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                                <div
                                    className={`h-1 rounded-full ${planUsage.limits.stores.current >= planUsage.limits.stores.limit ? "bg-red-500" : "bg-amber-500"}`}
                                    style={{ width: `${Math.min((planUsage.limits.stores.current / planUsage.limits.stores.limit) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span>スタッフ</span>
                                <span>{planUsage.limits.staff.current} / {planUsage.limits.staff.limit}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                                <div
                                    className="bg-amber-500 h-1 rounded-full"
                                    style={{ width: `${Math.min((planUsage.limits.staff.current / planUsage.limits.staff.limit) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={container}
                initial="hidden"
                animate="show"
            >
                <Card variants={item}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">今月の売上</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">¥{stats.sales.currentMonth.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">今月発生した確定/完了予約</p>
                    </CardContent>
                </Card>
                <Card variants={item}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">今月の予約数</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.bookings.currentMonth}件</div>
                        <p className="text-xs text-muted-foreground">新規作成された予約</p>
                    </CardContent>
                </Card>
                <Card variants={item}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">人気サービス (TOP 1)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">{topServiceName}</div>
                        <p className="text-xs text-muted-foreground">稼働中のサービス種類: {stats.activeServicesCount}</p>
                    </CardContent>
                </Card>
                <Card variants={item}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">承認待ち</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingCount}</div>
                        <p className="text-xs text-muted-foreground">要対応の予約</p>
                    </CardContent>
                </Card>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>最近の予約</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentBookings.length === 0 ? (
                                <p className="text-muted-foreground">予約はありません</p>
                            ) : (
                                stats.recentBookings.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{b.customer} 様</p>
                                            <p className="text-sm text-muted-foreground">{b.service}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">¥{(b.amount || 0).toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(b.date), 'MM/dd HH:mm')}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>新着レビュー</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(!stats.recentReviews || stats.recentReviews.length === 0) ? (
                                <p className="text-muted-foreground">レビューはまだありません</p>
                            ) : (
                                stats.recentReviews.map((r) => (
                                    <div key={r.id} className="border-b pb-3 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-medium text-sm">{r.customer || 'ゲスト'}</div>
                                            <div className="text-yellow-500 text-sm">{'★'.repeat(r.rating)}</div>
                                        </div>
                                        <div className="text-xs text-gray-400 mb-1">{r.service}</div>
                                        <p className="text-sm text-gray-600 line-clamp-2">{r.comment || 'コメントなし'}</p>
                                        <div className="text-right text-[10px] text-gray-400 mt-1">
                                            {format(new Date(r.date), 'MM/dd HH:mm')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-7">
                    <CardHeader>
                        <CardTitle>今日のスケジュール</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.todaysSchedule.length === 0 ? (
                                <p className="text-muted-foreground">本日の予約はありません</p>
                            ) : (
                                stats.todaysSchedule.map((s) => (
                                    <div key={s.id} className="flex items-center gap-4">
                                        <div className="bg-blue-100 text-blue-800 p-2 rounded text-xs font-bold w-16 text-center">
                                            {format(new Date(s.startTime), 'HH:mm')}
                                        </div>
                                        <div>
                                            <p className="font-medium">{s.staff}</p>
                                            <p className="text-xs text-muted-foreground">{s.items}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

