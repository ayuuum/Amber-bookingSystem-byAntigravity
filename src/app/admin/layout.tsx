"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Users, Settings, LogOut, Building, Menu, MessageSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let hasChecked = false; // Prevent multiple simultaneous checks

        const checkOnboarding = async () => {
            // Prevent multiple simultaneous checks
            if (hasChecked) return;
            hasChecked = true;

            try {
                // 1. Check Auth User with safe error handling
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                // Network errors should not trigger redirects - just log and wait
                if (userError) {
                    if (userError.message?.includes('Failed to fetch') || 
                        userError.message?.includes('NetworkError') ||
                        userError.name === 'NetworkError') {
                        console.error('[AdminLayout] Network error during auth check:', userError.message);
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

                // 2. Check Profile/Organization
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                // Network errors on profile fetch should not trigger redirects
                if (profileError) {
                    if (profileError.message?.includes('Failed to fetch') || 
                        profileError.message?.includes('NetworkError')) {
                        console.error('[AdminLayout] Network error during profile check:', profileError.message);
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (!profile?.organization_id) {
                    // オンボーディング直後のデータ反映ラグを考慮し、少し待機して再試行
                    await new Promise(resolve => setTimeout(resolve, 800));
                    const { data: retryProfile, error: retryError } = await supabase
                        .from('profiles')
                        .select('organization_id')
                        .eq('id', user.id)
                        .single();

                    // Network errors on retry should not trigger redirects
                    if (retryError) {
                        if (retryError.message?.includes('Failed to fetch') || 
                            retryError.message?.includes('NetworkError')) {
                            console.error('[AdminLayout] Network error during profile retry:', retryError.message);
                            if (isMounted) {
                                setLoading(false);
                            }
                            return;
                        }
                    }

                    if (!retryProfile?.organization_id) {
                        if (isMounted) {
                            router.replace('/onboarding');
                        }
                        return;
                    }
                }

                if (isMounted) {
                    setAuthorized(true);
                }
            } catch (err: any) {
                // Catch network errors and other unexpected errors
                if (err?.message?.includes('Failed to fetch') || 
                    err?.name === 'TypeError' ||
                    err?.message?.includes('network')) {
                    console.error('[AdminLayout] Network error during onboarding check:', err.message);
                    // Don't update state or redirect on network errors
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }
                console.error('[AdminLayout] Onboarding check failed:', err);
                if (isMounted) {
                    router.replace('/login');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        checkOnboarding();

        return () => {
            isMounted = false;
        };
    }, [router, supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const NavLinks = () => (
        <>
            <Link href="/admin" aria-current={pathname === '/admin' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="ダッシュボード"
                >
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    ダッシュボード
                </Button>
            </Link>
            <Link href="/admin/calendar" aria-current={pathname === '/admin/calendar' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/calendar' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="カレンダー"
                >
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    カレンダー
                </Button>
            </Link>
            <Link href="/admin/bookings" aria-current={pathname === '/admin/bookings' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/bookings' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="予約一覧"
                >
                    <Users className="h-4 w-4" aria-hidden="true" />
                    予約一覧
                </Button>
            </Link>
            <Link href="/admin/analytics" aria-current={pathname === '/admin/analytics' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/analytics' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="分析"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                    >
                        <line x1="12" x2="12" y1="20" y2="10" />
                        <line x1="18" x2="18" y1="20" y2="4" />
                        <line x1="6" x2="6" y1="20" y2="16" />
                    </svg>
                    分析
                </Button>
            </Link>
            <Link href="/admin/customers" aria-current={pathname === '/admin/customers' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/customers' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="顧客管理"
                >
                    <Users className="h-4 w-4" aria-hidden="true" />
                    顧客管理
                </Button>
            </Link>
            <Link href="/admin/messages" aria-current={pathname === '/admin/messages' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/messages' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="LINEメッセージ"
                >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    LINEメッセージ
                </Button>
            </Link>
            <Link href="/admin/stores" aria-current={pathname === '/admin/stores' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/stores' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="店舗管理"
                >
                    <Building className="h-4 w-4" aria-hidden="true" />
                    店舗管理
                </Button>
            </Link>
            <Link href="/admin/plan" aria-current={pathname === '/admin/plan' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/plan' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="プラン"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                    >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    プラン
                </Button>
            </Link>
            <Link href="/admin/events" aria-current={pathname === '/admin/events' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/events' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="イベント監視"
                >
                    <Activity className="h-4 w-4" aria-hidden="true" />
                    イベント監視
                </Button>
            </Link>
            <Link href="/admin/settings" aria-current={pathname === '/admin/settings' ? 'page' : undefined}>
                <Button
                    variant={pathname === '/admin/settings' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    aria-label="設定"
                >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    設定
                </Button>
            </Link>
        </>
    );

    if (loading) {
        return <div className="flex h-screen items-center justify-center text-muted-foreground" aria-live="polite" aria-busy="true">読み込み中...</div>;
    }

    if (!authorized) {
        return null;
    }

    return (
        <div className="flex h-screen bg-background dark:bg-background">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-card dark:bg-card border-r hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold">Amber管理画面</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <NavLinks />
                </nav>
                <div className="p-4 border-t">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleLogout}
                        aria-label="ログアウト"
                    >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        ログアウト
                    </Button>
                </div>
            </aside>

            {/* Mobile Drawer Menu */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="メニューを開く">
                            <Menu className="h-5 w-5" aria-hidden="true" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0" aria-label="メインメニュー">
                        <SheetHeader className="p-6 border-b">
                            <SheetTitle className="text-2xl font-bold">Amber管理画面</SheetTitle>
                        </SheetHeader>
                        <nav className="flex-1 p-4 space-y-2" aria-label="ナビゲーションメニュー">
                            <NavLinks />
                        </nav>
                        <div className="p-4 border-t">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={handleLogout}
                            aria-label="ログアウト"
                        >
                            <LogOut className="h-4 w-4" aria-hidden="true" />
                            ログアウト
                        </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto md:ml-0 ml-0">
                {children}
            </main>
        </div>
    );
}

