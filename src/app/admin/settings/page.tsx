"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, CreditCard, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Organization } from "@/types";

export default function OrganizationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [org, setOrg] = useState<Organization | null>(null);

    const supabase = createClient();

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
            alert('Stripe 連携の開始に失敗しました: ' + e.message);
        } finally {
            setConnecting(false);
        }
    };

    useEffect(() => {
        const fetchOrg = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            if (!profile?.organization_id) return;

            const { data } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
            if (data) setOrg(data as Organization);
            setLoading(false);
        };
        fetchOrg();
    }, []);

    const handleSave = async () => {
        if (!org) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('organizations').update({
                name: org.name,
                // Slug usually immutable after creation or handled carefully
            }).eq('id', org.id);

            if (error) throw error;
            alert('保存しました');
        } catch (e) {
            console.error(e);
            alert('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
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
        </div>
    );
}
