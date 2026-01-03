"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Palette, CheckCircle2, MessageSquare, Copy, ExternalLink } from "lucide-react";
import { Store } from "@/types";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
    { key: 'mon', label: '月曜日' },
    { key: 'tue', label: '火曜日' },
    { key: 'wed', label: '水曜日' },
    { key: 'thu', label: '木曜日' },
    { key: 'fri', label: '金曜日' },
    { key: 'sat', label: '土曜日' },
    { key: 'sun', label: '日曜日' },
];

export default function StoreEditPage() {
    const params = useParams();
    const storeId = params.id as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lineLoading, setLineLoading] = useState(false);
    const [lineVerifying, setLineVerifying] = useState(false);
    const [planAccess, setPlanAccess] = useState<{ canUseLine: boolean } | null>(null);

    const [store, setStore] = useState<Store | null>(null);
    const [businessHours, setBusinessHours] = useState<any>({});
    const [lineIntegration, setLineIntegration] = useState<{
        is_connected: boolean;
        channel_secret_masked?: string;
        webhook_url?: string;
    } | null>(null);
    const [lineFormData, setLineFormData] = useState({
        channel_access_token: '',
        channel_secret: '',
    });

    const supabase = createClient();

    useEffect(() => {
        const fetchStore = async () => {
            if (!storeId) return;
            const { data, error } = await supabase.from('stores').select('*').eq('id', storeId).single();
            if (data) {
                setStore(data as Store);
                setBusinessHours(data.settings?.business_hours || {});
            }
            setLoading(false);
        };
        fetchStore();
    }, [storeId]);

    useEffect(() => {
        const fetchLineIntegration = async () => {
            if (!storeId) return;
            try {
                const res = await fetch(`/api/stores/${storeId}/line`);
                if (res.ok) {
                    const data = await res.json();
                    setLineIntegration(data);
                }
            } catch (error) {
                console.error('Failed to fetch LINE integration:', error);
            }
        };
        fetchLineIntegration();
    }, [storeId]);

    useEffect(() => {
        const fetchPlanAccess = async () => {
            if (!store?.organization_id) return;
            try {
                const res = await fetch('/api/admin/plan/usage');
                if (res.ok) {
                    const data = await res.json();
                    setPlanAccess(data.access);
                }
            } catch (error) {
                console.error('Failed to fetch plan access:', error);
            }
        };
        fetchPlanAccess();
    }, [store?.organization_id]);

    const handleSave = async () => {
        if (!store) return;
        setSaving(true);
        try {
            const updatedSettings = {
                ...store.settings,
                business_hours: businessHours
            };

            const { error } = await supabase.from('stores').update({
                name: store.name,
                address: store.address,
                phone: store.phone,
                settings: updatedSettings
            }).eq('id', store.id);

            if (error) throw error;
            toast({
                title: "保存しました",
                description: "店舗設定を正常に保存しました。",
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

    const handleHourChange = (dayKey: string, type: 'start' | 'end', value: string) => {
        const current = businessHours[dayKey] || ["09:00", "18:00", true]; // [start, end, isOpen] logic
        // My previous logic was purely dict based. Let's align with schema.
        // Actually the schema uses `business_hours: { [key]: { open: string, close: string, isOpen: boolean } }` in my logic file.
        // The old settings page used array `[start, end]`.
        // I should standardize to Object format for v1.1 logic compatibility.
        // Logic: `{ open: "09:00", close: "18:00", isOpen: true }`

        const currentObj = businessHours[dayKey] || { open: "09:00", close: "18:00", isOpen: false };
        let newObj = { ...currentObj };
        if (type === 'start') newObj.open = value;
        else newObj.close = value;

        setBusinessHours({ ...businessHours, [dayKey]: newObj });
    };

    const handleToggleDay = (dayKey: string, isOpen: boolean) => {
        const currentObj = businessHours[dayKey] || { open: "09:00", close: "18:00", isOpen: false };
        setBusinessHours({ ...businessHours, [dayKey]: { ...currentObj, isOpen } });
    };

    const handleLineSave = async () => {
        if (!lineFormData.channel_access_token || !lineFormData.channel_secret) {
            toast({
                variant: 'destructive',
                title: '入力エラー',
                description: 'Channel Access TokenとChannel Secretは必須です',
            });
            return;
        }

        setLineLoading(true);
        try {
            const res = await fetch(`/api/stores/${storeId}/line`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lineFormData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error?.message || '保存に失敗しました');
            }

            toast({
                title: '保存しました',
                description: 'LINE連携情報を保存しました',
            });

            // 再取得
            const fetchRes = await fetch(`/api/stores/${storeId}/line`);
            if (fetchRes.ok) {
                const fetchData = await fetchRes.json();
                setLineIntegration(fetchData);
                setLineFormData({ channel_access_token: '', channel_secret: '' });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: '保存失敗',
                description: error.message || 'LINE連携情報の保存に失敗しました',
            });
        } finally {
            setLineLoading(false);
        }
    };

    const handleLineVerify = async () => {
        setLineVerifying(true);
        try {
            const res = await fetch(`/api/stores/${storeId}/line/verify`, {
                method: 'POST',
            });

            const data = await res.json();

            if (data.verified) {
                toast({
                    title: '検証成功',
                    description: data.channel_name ? `連携が正常に動作しています（${data.channel_name}）` : '連携が正常に動作しています',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: '検証失敗',
                    description: data.error || 'LINE連携の検証に失敗しました',
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: '検証エラー',
                description: error.message || 'LINE連携の検証中にエラーが発生しました',
            });
        } finally {
            setLineVerifying(false);
        }
    };

    const handleLineDisconnect = async () => {
        if (!confirm('LINE連携を解除しますか？')) return;

        setLineLoading(true);
        try {
            const res = await fetch(`/api/stores/${storeId}/line`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('連携解除に失敗しました');
            }

            toast({
                title: '連携解除',
                description: 'LINE連携を解除しました',
            });

            // 再取得
            const fetchRes = await fetch(`/api/stores/${storeId}/line`);
            if (fetchRes.ok) {
                const fetchData = await fetchRes.json();
                setLineIntegration(fetchData);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'エラー',
                description: error.message || 'LINE連携の解除に失敗しました',
            });
        } finally {
            setLineLoading(false);
        }
    };

    const handleCopyWebhookUrl = () => {
        if (lineIntegration?.webhook_url) {
            navigator.clipboard.writeText(lineIntegration.webhook_url);
            toast({
                title: 'コピーしました',
                description: 'Webhook URLをクリップボードにコピーしました',
            });
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!store) return <div className="p-8">Store not found</div>;

    return (
        <div className="container mx-auto p-8 max-w-4xl space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">店舗編集: {store.name}</h1>
                <div className="flex items-center gap-2">
                    <Link href={`/admin/stores/${storeId}/branding`}>
                        <Button variant="outline">
                            <Palette className="mr-2 h-4 w-4" /> ブランディング設定
                        </Button>
                    </Link>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" /> 保存
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>店舗名</Label>
                            <Input value={store.name} onChange={e => setStore({ ...store, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>住所</Label>
                            <Input value={store.address || ""} onChange={e => setStore({ ...store, address: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>電話番号</Label>
                            <Input value={store.phone || ""} onChange={e => setStore({ ...store, phone: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Slug</Label>
                            <Input value={store.slug || ""} disabled className="bg-muted" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>営業時間</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {DAYS.map((day) => {
                            const dayConfig = businessHours[day.key] || { open: "09:00", close: "18:00", isOpen: true }; // Default open?
                            // Logic says if not in settings, assume default? Or default closed?
                            // Let's assume default OPEN 9-18 for ease.

                            return (
                                <div key={day.key} className="flex items-center gap-4 p-2 border-b">
                                    <div className="w-24 font-medium flex items-center gap-2">
                                        <Switch
                                            checked={dayConfig.isOpen}
                                            onCheckedChange={(c) => handleToggleDay(day.key, c)}
                                        />
                                        {day.label}
                                    </div>
                                    {dayConfig.isOpen && (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="time"
                                                value={dayConfig.open}
                                                onChange={(e) => handleHourChange(day.key, 'start', e.target.value)}
                                                className="w-32"
                                            />
                                            <span>〜</span>
                                            <Input
                                                type="time"
                                                value={dayConfig.close}
                                                onChange={(e) => handleHourChange(day.key, 'end', e.target.value)}
                                                className="w-32"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" /> LINE連携
                            </CardTitle>
                            <CardDescription>
                                LINE公式アカウントと連携すると、この店舗の予約通知やリマインドをLINEで送信できます。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {planAccess && !planAccess.canUseLine && (
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-800">
                            <p className="text-sm font-bold">
                                Growthプラン以上で利用可能です。プラン変更は<Link href="/admin/plan" className="underline">こちら</Link>から。
                            </p>
                        </div>
                    )}

                    {lineIntegration?.is_connected ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="font-black text-emerald-900">LINE連携済み</div>
                                        {lineIntegration.channel_secret_masked && (
                                            <div className="text-xs text-emerald-700 font-medium">
                                                Secret: {lineIntegration.channel_secret_masked}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleLineVerify}
                                        disabled={lineVerifying || !planAccess?.canUseLine}
                                        className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold"
                                    >
                                        {lineVerifying ? '確認中...' : '動作確認'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleLineDisconnect}
                                        disabled={lineLoading || !planAccess?.canUseLine}
                                        className="rounded-xl border-red-200 text-red-700 hover:bg-red-100 font-bold"
                                    >
                                        連携解除
                                    </Button>
                                </div>
                            </div>

                            {lineIntegration.webhook_url && (
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                                                Webhook URL
                                            </Label>
                                            <p className="text-sm font-mono text-slate-700 break-all">
                                                {lineIntegration.webhook_url}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                LINE DevelopersでこのURLをWebhook URLとして設定してください
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyWebhookUrl}
                                            className="ml-4"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800">
                                <p className="text-sm font-bold leading-relaxed">
                                    LINE公式アカウントと連携すると、この店舗の予約通知やリマインドをLINEで送信できます。
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="channel_access_token">Channel Access Token</Label>
                                    <Input
                                        id="channel_access_token"
                                        type="password"
                                        value={lineFormData.channel_access_token}
                                        onChange={(e) => setLineFormData({ ...lineFormData, channel_access_token: e.target.value })}
                                        placeholder="LINE Messaging API Channel Access Token"
                                        disabled={!planAccess?.canUseLine}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="channel_secret">Channel Secret</Label>
                                    <Input
                                        id="channel_secret"
                                        type="password"
                                        value={lineFormData.channel_secret}
                                        onChange={(e) => setLineFormData({ ...lineFormData, channel_secret: e.target.value })}
                                        placeholder="LINE Messaging API Channel Secret"
                                        disabled={!planAccess?.canUseLine}
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleLineSave}
                                disabled={lineLoading || !planAccess?.canUseLine}
                                className="w-full h-14 rounded-2xl bg-[#00B900] hover:bg-[#009900] text-white font-black text-lg shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="w-6 h-6" />
                                {lineLoading ? '保存中...' : 'LINE連携を開始'}
                            </Button>

                            {lineIntegration?.webhook_url && (
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                                                Webhook URL
                                            </Label>
                                            <p className="text-sm font-mono text-slate-700 break-all">
                                                {lineIntegration.webhook_url}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                LINE DevelopersでこのURLをWebhook URLとして設定してください
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyWebhookUrl}
                                            className="ml-4"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
