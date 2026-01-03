"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DollarSign, Users, CalendarCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner";
import { LoadingState } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

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
    // 4. 初期 state を安全な形にする
    const [stats, setStats] = useState<DashboardStats>({
        sales: { currentMonth: 0 },
        bookings: { currentMonth: 0 },
        pendingCount: 0,
        activeServicesCount: 0,
        topServices: [],
        recentBookings: [],
        recentReviews: [],
        todaysSchedule: [],
    });
    const [planUsage, setPlanUsage] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;
        let hasFetched = false; // Prevent multiple simultaneous fetches

        const fetchData = async () => {
            // Prevent multiple simultaneous fetches
            if (hasFetched) return;
            hasFetched = true;

            try {
                // 1. 認証とプロフィールの確認（初期ガード）
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                // Network errors should not trigger redirects - just log and return
                if (userError) {
                    if (userError.message?.includes('Failed to fetch') || 
                        userError.message?.includes('NetworkError') ||
                        userError.name === 'NetworkError') {
                        console.error('[AdminDashboard] Network error during auth check:', userError.message);
                        // Don't update state or redirect on network errors
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                    // Other auth errors should redirect
                    if (isMounted) {
                        router.replace('/login');
                    }
                    return;
                }

                if (!user) {
                    if (isMounted) {
                        router.replace('/login');
                    }
                    return;
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                // Network errors on profile fetch should not trigger redirects
                if (profileError) {
                    if (profileError.message?.includes('Failed to fetch') || 
                        profileError.message?.includes('NetworkError')) {
                        console.error('[AdminDashboard] Network error during profile check:', profileError.message);
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                }

                // プロフィールまたは組織IDがない場合はオンボーディングへ強制リダイレクト
                if (profileError || !profile?.organization_id) {
                    console.log('No profile or organization found, redirecting to onboarding...');
                    if (isMounted) {
                        router.replace('/onboarding');
                    }
                    return;
                }

                // 2. 組織が存在する場合のみデータを取得
                const [statsRes, planRes] = await Promise.all([
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/plan/usage')
                ]);

                // 500エラーの場合でも権限不足の可能性があるので、レスポンスを確認する
                let statsData: any;
                try {
                    const statsText = await statsRes.text();
                    statsData = JSON.parse(statsText);
                } catch (parseError: any) {
                    statsData = {};
                }

                const planData = await planRes.json();

                // 権限不足・未実装は正常系として扱う（console.errorは出さない）
                if (!statsRes.ok || statsData.error) {
                    const errorMessage = statsData.error?.message || statsData.error || '';
                    const isPermissionDenied = typeof errorMessage === 'string' && (
                        errorMessage.includes('permission denied') ||
                        (errorMessage.includes('relation') && errorMessage.includes('does not exist')) ||
                        errorMessage.includes('Could not find')
                    );
                    
                    if (isPermissionDenied || JSON.stringify(statsData) === '{}') {
                        // 権限不足・未実装は正常系として扱う（空のstatsをセット、console.errorは出さない）
                        setStats(prev => ({
                            ...prev,
                            sales: { currentMonth: 0 },
                            bookings: { currentMonth: 0 },
                            pendingCount: 0,
                            activeServicesCount: 0,
                            topServices: [],
                            recentBookings: [],
                            todaysSchedule: [],
                            recentReviews: []
                        }));
                    } else {
                        // 本当に致命的なエラーのみconsole.error（ネットワーク断など）
                        console.error('Stats API error:', statsRes.status, statsRes.statusText, statsData.error);
                    }
                } else {
                    // 防御的にデータをセット（空配列も正常な状態として扱う）
                    setStats(prev => ({
                        ...prev,
                        ...statsData
                    }));
                }
                
                if (!planRes.ok) {
                    // plan usage APIのエラーも同様に扱う（権限不足は正常系）
                    const planErrorMessage = planData.error?.message || planData.error || '';
                    const isPlanPermissionDenied = typeof planErrorMessage === 'string' && (
                        planErrorMessage.includes('permission denied') ||
                        (planErrorMessage.includes('relation') && planErrorMessage.includes('does not exist'))
                    );
                    if (!isPlanPermissionDenied) {
                        // 本当に致命的なエラーのみconsole.error
                        console.error('Plan usage API error:', planRes.status, planRes.statusText);
                    }
                } else {
                    setPlanUsage(planData);
                }

                if (planData.error) {
                    console.error('Plan usage API returned error:', planData.error);
                } else {
                    setPlanUsage(planData);
                }
            } catch (error: any) {
                // Catch network errors and other unexpected errors
                if (error?.message?.includes('Failed to fetch') || 
                    error?.name === 'TypeError' ||
                    error?.message?.includes('network')) {
                    console.error('[AdminDashboard] Network error during data fetch:', error.message);
                    // Don't update state on network errors
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }
                console.error("[AdminDashboard] Failed to fetch dashboard data", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        fetchData();

        return () => {
            isMounted = false;
        };
    }, [router, supabase]);

    if (loading) {
        return <LoadingState message="読み込み中..." />;
    }

    // 初期状態でも表示を続けるため、!stats による早期リターンを削除または調整
    const topServiceName = (Array.isArray(stats?.topServices) && stats.topServices.length > 0)
        ? stats.topServices[0].name
        : "なし";

    return (
        <div className="p-8">
            {/* レベル0: 初期設定ブロック（ヒーローカード） */}
            <div className="bg-muted rounded-xl border shadow-sm p-6 mb-10">
                <OnboardingBanner />
            </div>

            {/* レベル1: 状態サマリー（経営・状態サマリー） */}
            <section className="mb-10">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold tracking-tight">ビジネス概要</h2>
                    <p className="text-muted-foreground">現在の状態と主要指標</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {/* プランカード */}
                    {planUsage && (
                        <Card className="md:col-span-2 lg:col-span-1" style={{ borderColor: 'var(--warning-border)', backgroundColor: 'var(--warning-light)' }}>
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold">
                                    プラン: <span className="capitalize" style={{ color: 'var(--warning)' }}>{planUsage.planType}</span>
                                </CardTitle>
                                {planUsage.planType === 'starter' && (
                                    <Link href="/admin/settings?tab=billing">
                                        <Button size="sm" variant="outline" className="h-7 text-[10px]" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                                            アップグレード
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
                                        className={`h-1 rounded-full ${planUsage.limits.stores.current >= planUsage.limits.stores.limit ? "bg-red-500" : ""}`}
                                        style={{ 
                                            width: `${Math.min((planUsage.limits.stores.current / planUsage.limits.stores.limit) * 100, 100)}%`,
                                            backgroundColor: planUsage.limits.stores.current >= planUsage.limits.stores.limit ? undefined : 'var(--warning)'
                                        }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span>スタッフ</span>
                                    <span>{planUsage.limits.staff.current} / {planUsage.limits.staff.limit}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                    <div
                                        className="h-1 rounded-full"
                                        style={{ 
                                            width: `${Math.min((planUsage.limits.staff.current / planUsage.limits.staff.limit) * 100, 100)}%`,
                                            backgroundColor: 'var(--warning)'
                                        }}
                                    ></div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {/* KPIカード群 */}
                    <motion.div
                        className={`grid gap-4 ${planUsage ? 'md:col-span-2 lg:col-span-4 md:grid-cols-2 lg:grid-cols-4' : 'md:col-span-2 lg:col-span-4 md:grid-cols-2 lg:grid-cols-4'}`}
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
                                <p className="text-xs text-muted-foreground mt-1">今月発生した確定/完了予約</p>
                            </CardContent>
                        </Card>
                        <Card variants={item}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">今月の予約数</CardTitle>
                                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.bookings.currentMonth}件</div>
                                <p className="text-xs text-muted-foreground mt-1">新規作成された予約</p>
                            </CardContent>
                        </Card>
                        <Card variants={item}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">人気サービス (TOP 1)</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold truncate">{topServiceName}</div>
                                <p className="text-xs text-muted-foreground mt-1">稼働中のサービス種類: {stats.activeServicesCount}</p>
                            </CardContent>
                        </Card>
                        <Card variants={item}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">承認待ち</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.pendingCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">要対応の予約</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            {/* レベル2: 今日のオペレーション */}
            <section className="mb-10">
                <Card>
                    <CardHeader>
                        <CardTitle>今日のスケジュール</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {!Array.isArray(stats?.todaysSchedule) || stats.todaysSchedule.length === 0 ? (
                                <EmptyState
                                    title="本日の予約はありません"
                                    description="今日の予約はありません。"
                                    compact
                                />
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
            </section>

            {/* レベル3: 履歴・参考情報 */}
            <section className="mb-10">
                <Card>
                    <CardHeader>
                        <CardTitle>最近の予約</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {!Array.isArray(stats?.recentBookings) || stats.recentBookings.length === 0 ? (
                                <EmptyState
                                    title="予約はありません"
                                    description="まだ予約が登録されていません。"
                                    compact
                                />
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
            </section>

            {/* レベル3: 履歴・参考情報 */}
            <section>
                <Card>
                    <CardHeader>
                        <CardTitle>新着レビュー</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {!Array.isArray(stats?.recentReviews) || stats.recentReviews.length === 0 ? (
                                <EmptyState
                                    title="レビューはまだありません"
                                    description="お客様からのレビューがまだありません。"
                                    compact
                                />
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
            </section>
        </div>
    );
}

