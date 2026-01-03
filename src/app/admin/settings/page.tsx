"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, CreditCard, CheckCircle2, Calendar, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Organization } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading";

export default function OrganizationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [org, setOrg] = useState<Organization | null>(null);
    const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    const supabase = createClient();
    const { toast } = useToast();

    const handleStripeConnect = async () => {
        setConnecting(true);
        try {
            const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to get onboarding link');
            }
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Stripe 連携の開始に失敗しました",
                description: e.message || "エラーが発生しました",
                variant: "destructive",
            });
        } finally {
            setConnecting(false);
        }
    };

    const handleGoogleCalendarConnect = () => {
        const returnUrl = encodeURIComponent('/admin/settings');
        window.location.href = `/api/auth/google?returnUrl=${returnUrl}`;
    };

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/sync/calendar', {
                method: 'POST',
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '同期に失敗しました');
            }

            toast({
                title: "同期完了",
                description: data.message || "カレンダーの同期が完了しました",
                variant: "default",
            });
        } catch (error: any) {
            toast({
                title: "同期エラー",
                description: error.message || "カレンダーの同期に失敗しました",
                variant: "destructive",
            });
        } finally {
            setSyncing(false);
        }
    };

    // Check for OAuth callback success/errors and refresh connection status
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        
        if (error) {
            let errorMessage = '連携中にエラーが発生しました';
            switch (error) {
                case 'no_code':
                    errorMessage = '認証コードが取得できませんでした';
                    break;
                case 'callback_failed':
                    errorMessage = '認証処理に失敗しました';
                    break;
                default:
                    errorMessage = `エラー: ${error}`;
            }
            toast({
                title: "Google Calendar 連携エラー",
                description: errorMessage,
                variant: "destructive",
            });
            // Remove error from URL
            window.history.replaceState({}, '', '/admin/settings');
        } else if (params.has('error') === false && storeId) {
            // Refresh connection status after successful callback
            const checkConnection = async () => {
                const { data: store } = await supabase
                    .from('stores')
                    .select('google_refresh_token')
                    .eq('id', storeId)
                    .single();
                
                if (store) {
                    setGoogleCalendarConnected(!!store.google_refresh_token);
                    if (store.google_refresh_token) {
                        toast({
                            title: "連携完了",
                            description: "Google Calendar との連携が完了しました",
                            variant: "default",
                        });
                    }
                }
            };
            checkConnection();
        }
    }, [toast, storeId, supabase]);

    useEffect(() => {
        let isMounted = true;
        let hasFetched = false; // Prevent multiple simultaneous fetches

        const fetchOrg = async () => {
            // Prevent multiple simultaneous fetches
            if (hasFetched) return;
            hasFetched = true;

            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                // Network errors should not trigger state updates
                if (userError) {
                    if (userError.message?.includes('Failed to fetch') || 
                        userError.message?.includes('NetworkError') ||
                        userError.name === 'NetworkError') {
                        console.error('[SettingsPage] Network error during auth check:', userError.message);
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (!user) {
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                // Network errors on profile fetch should not trigger state updates
                if (profileError) {
                    if (profileError.message?.includes('Failed to fetch') || 
                        profileError.message?.includes('NetworkError')) {
                        console.error('[SettingsPage] Network error during profile check:', profileError.message);
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (!profile?.organization_id) {
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }

                const { data, error: orgError } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', profile.organization_id)
                    .single();

                // Network errors on org fetch should not trigger state updates
                if (orgError) {
                    if (orgError.message?.includes('Failed to fetch') || 
                        orgError.message?.includes('NetworkError')) {
                        console.error('[SettingsPage] Network error during org check:', orgError.message);
                        if (isMounted) {
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (data && isMounted) {
                    setOrg(data as Organization);
                }

                // Fetch store to check Google Calendar connection
                if (profile?.organization_id && isMounted) {
                    const { data: stores, error: storesError } = await supabase
                        .from('stores')
                        .select('id, google_refresh_token')
                        .eq('organization_id', profile.organization_id)
                        .limit(1)
                        .maybeSingle();

                    if (!storesError && stores) {
                        setStoreId(stores.id);
                        setGoogleCalendarConnected(!!stores.google_refresh_token);
                    }
                }
            } catch (error: any) {
                // Catch network errors and other unexpected errors
                if (error?.message?.includes('Failed to fetch') || 
                    error?.name === 'TypeError' ||
                    error?.message?.includes('network')) {
                    console.error('[SettingsPage] Network error during org fetch:', error.message);
                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }
                console.error('[SettingsPage] Failed to fetch org:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        fetchOrg();

        return () => {
            isMounted = false;
        };
    }, [supabase]);

    const handleSave = async () => {
        if (!org) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('organizations').update({
                name: org.name,
                // Slug usually immutable after creation or handled carefully
            }).eq('id', org.id);

            if (error) throw error;
            toast({
                title: "保存しました",
                description: "組織設定を正常に保存しました。",
                variant: "default",
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "保存に失敗しました",
                description: "エラーが発生しました。もう一度お試しください。",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState message="読み込み中..." />;
    if (!org) return <div className="p-8">No Organization found</div>;

    return (
        <div className="container mx-auto p-8 max-w-4xl space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">組織設定</h1>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" /> 設定を保存
                </Button>
            </div>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <CardTitle className="text-xl font-black tracking-tight">基本情報</CardTitle>
                    <CardDescription className="font-medium text-slate-500">組織 (Organization) の基本設定です。</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">組織名 (屋号)</Label>
                        <Input
                            value={org.name}
                            onChange={e => setOrg({ ...org, name: e.target.value })}
                            className="h-12 rounded-xl border-slate-200 focus:ring-amber-500 font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">URL識別子 (Slug)</Label>
                        <Input value={org.slug} disabled className="h-12 rounded-xl bg-slate-50 border-slate-100 text-slate-400 font-mono" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">決済・振込設定</CardTitle>
                            <CardDescription className="font-medium text-slate-500">Stripe Connect を使用して、売上の受取設定を行います。</CardDescription>
                        </div>
                        <CreditCard className="w-8 h-8 text-slate-300" />
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    {org.stripe_account_id ? (
                        <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="font-black text-emerald-900">Stripe 連携済み</div>
                                    <div className="text-xs text-emerald-700 font-medium">ID: {org.stripe_account_id}</div>
                                </div>
                            </div>
                            <Button variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold">
                                ダッシュボードを確認
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800">
                                <p className="text-sm font-bold leading-relaxed">
                                    オンライン決済の売上を受け取るには、Stripe アカウントの開設（または既存アカウントの連携）が必要です。<br />
                                    Amber では、プラットフォーム手数料 7% を差し引いた金額が自動的に振り込まれます。
                                </p>
                            </div>
                            <Button
                                onClick={handleStripeConnect}
                                disabled={connecting}
                                className="w-full h-14 rounded-2xl bg-[#635BFF] hover:bg-[#5851E0] text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-6 h-6" />
                                {connecting ? '準備中...' : 'Stripe と連携して売上を受け取る'}
                            </Button>
                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Powered by Stripe | Secure and Compliant
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">外部サービス連携</CardTitle>
                            <CardDescription className="font-medium text-slate-500">Google Calendar と連携して、予約可能時間を自動調整します。</CardDescription>
                        </div>
                        <Calendar className="w-8 h-8 text-slate-300" />
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    {googleCalendarConnected ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="font-black text-emerald-900">Google Calendar 連携済み</div>
                                        <div className="text-xs text-emerald-700 font-medium">
                                            カレンダーの「予定あり」時間が予約可能時間から自動的に除外されます
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold"
                                    onClick={handleGoogleCalendarConnect}
                                >
                                    再連携
                                </Button>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">手動同期</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            カレンダーを手動で同期します（通常は自動で同期されます）
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleManualSync}
                                        disabled={syncing}
                                        className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                        {syncing ? '同期中...' : '同期する'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800">
                                <p className="text-sm font-bold leading-relaxed">
                                    Google Calendar と連携すると、あなたのカレンダーに登録されている「予定あり」の時間帯が自動的に予約可能時間から除外されます。<br />
                                    これにより、二重予約を防ぎ、より効率的な予約管理が可能になります。
                                </p>
                            </div>
                            <Button
                                onClick={handleGoogleCalendarConnect}
                                disabled={connecting}
                                className="w-full h-14 rounded-2xl bg-[#4285F4] hover:bg-[#357AE8] text-white font-black text-lg shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Calendar className="w-6 h-6" />
                                {connecting ? '準備中...' : 'Google Calendar と連携する'}
                            </Button>
                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Powered by Google Calendar API | Secure OAuth 2.0
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
