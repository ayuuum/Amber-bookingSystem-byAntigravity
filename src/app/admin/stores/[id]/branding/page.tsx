"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, ChevronLeft, Palette, Type, Layout, Image } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading";

interface ThemeSettings {
    primary_color: string;
    accent_color: string;
    welcome_title: string;
    welcome_description: string;
    hero_title: string;
    hero_description: string;
    hero_background_image: string;
}

const DEFAULT_THEME: ThemeSettings = {
    primary_color: "#f59e0b", // amber-500
    accent_color: "#1e293b",  // slate-800
    welcome_title: "サービス予約",
    welcome_description: "ご希望のメニューと日時を選択してください。最短1分で予約が完了します。",
    hero_title: "究極の「おもてなし」を、\nあなたの住まいに。",
    hero_description: "Amberは、技術とホスピタリティを極めた掃除代行サービスです。",
    hero_background_image: "/hero.png",
};

export default function StoreBrandingPage() {
    const params = useParams();
    const router = useRouter();
    const storeId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [storeName, setStoreName] = useState("");
    const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);

    const supabase = createClient();
    const { toast } = useToast();

    useEffect(() => {
        const fetchStore = async () => {
            if (!storeId) return;
            const { data } = await supabase.from('stores').select('name, settings').eq('id', storeId).single();
            if (data) {
                setStoreName(data.name);
                if (data.settings?.theme) {
                    setTheme({ ...DEFAULT_THEME, ...data.settings.theme });
                }
            }
            setLoading(false);
        };
        fetchStore();
    }, [storeId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: currentStore } = await supabase.from('stores').select('settings').eq('id', storeId).single();

            const updatedSettings = {
                ...(currentStore?.settings || {}),
                theme: theme
            };

            const { error } = await supabase.from('stores').update({
                settings: updatedSettings
            }).eq('id', storeId);

            if (error) throw error;
            toast({
                title: "ブランディング設定を保存しました",
                description: "予約画面の設定を正常に保存しました。",
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

    return (
        <div className="container mx-auto p-8 max-w-6xl space-y-8 pb-20">
            <div className="flex items-center gap-4">
                <Link href={`/admin/stores/${storeId}`}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">予約画面のカスタマイズ</h1>
                    <p className="text-muted-foreground">{storeName} のブランド設定</p>
                </div>
                <div className="ml-auto">
                    <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                        <Save className="mr-2 h-4 w-4" /> 設定を保存
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Editor Panel */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" /> カラー設定
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">ブランドカラー (Primary)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={theme.primary_color}
                                            onChange={e => setTheme({ ...theme, primary_color: e.target.value })}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={theme.primary_color}
                                            onChange={e => setTheme({ ...theme, primary_color: e.target.value })}
                                            className="flex-1 font-mono uppercase"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">アクセントカラー (Accent)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={theme.accent_color}
                                            onChange={e => setTheme({ ...theme, accent_color: e.target.value })}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={theme.accent_color}
                                            onChange={e => setTheme({ ...theme, accent_color: e.target.value })}
                                            className="flex-1 font-mono uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Type className="h-5 w-5" /> コンテンツ設定
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">ウェルカムタイトル</Label>
                                <Input
                                    value={theme.welcome_title}
                                    onChange={e => setTheme({ ...theme, welcome_title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">ウェルカム説明文</Label>
                                <Input
                                    value={theme.welcome_description}
                                    onChange={e => setTheme({ ...theme, welcome_description: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Image className="h-5 w-5" /> ヒーローセクション設定
                            </CardTitle>
                            <CardDescription className="text-xs">
                                トップページのヒーロー画像とメッセージを設定します
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">ヒーロータイトル</Label>
                                <Textarea
                                    value={theme.hero_title}
                                    onChange={e => setTheme({ ...theme, hero_title: e.target.value })}
                                    placeholder="究極の「おもてなし」を、&#10;あなたの住まいに。"
                                    rows={3}
                                    className="resize-none"
                                />
                                <p className="text-[10px] text-slate-400">改行は \n で入力してください</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">ヒーロー説明文</Label>
                                <Textarea
                                    value={theme.hero_description}
                                    onChange={e => setTheme({ ...theme, hero_description: e.target.value })}
                                    placeholder="Amberは、技術とホスピタリティを極めた掃除代行サービスです。"
                                    rows={2}
                                    className="resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">背景画像URL</Label>
                                <Input
                                    value={theme.hero_background_image}
                                    onChange={e => setTheme({ ...theme, hero_background_image: e.target.value })}
                                    placeholder="/hero.png"
                                />
                                {theme.hero_background_image && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                                        <img
                                            src={theme.hero_background_image}
                                            alt="背景画像プレビュー"
                                            className="w-full h-32 object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-400">画像のURLを入力してください（/hero.png または外部URL）</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Panel (Sticky) */}
                <div className="lg:sticky lg:top-8 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <Label className="text-sm font-bold flex items-center gap-2">
                            <Layout className="h-4 w-4" /> プレビュー
                        </Label>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase">Real-time</span>
                    </div>

                    <div className="space-y-4">
                        {/* Hero Section Preview */}
                        <div className="border rounded-3xl bg-neutral-50 p-2 shadow-inner overflow-hidden">
                            <div className="relative h-48 w-full overflow-hidden rounded-2xl">
                                <img
                                    src={theme.hero_background_image || "/hero.png"}
                                    alt="ヒーロー背景"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/hero.png";
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                                <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                                    <div className="max-w-4xl space-y-3">
                                        <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-2xl">
                                            {theme.hero_title.split('\n').map((line, i) => (
                                                <span key={i}>
                                                    {line}
                                                    {i < theme.hero_title.split('\n').length - 1 && <br />}
                                                </span>
                                            ))}
                                        </h1>
                                        <p className="text-sm text-white/90 font-medium drop-shadow-md">
                                            {theme.hero_description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Booking Form Preview */}
                        <div className="border rounded-3xl bg-neutral-50 p-4 shadow-inner overflow-hidden min-h-[400px]">
                            <div className="bg-white rounded-2xl shadow-sm min-h-[360px] flex flex-col overflow-hidden">
                                {/* Header preview */}
                                <div className="p-8 text-center space-y-3">
                                    <div
                                        className="inline-block text-[10px] font-bold px-3 py-1 rounded-full border"
                                        style={{ borderColor: theme.primary_color, color: theme.primary_color }}
                                    >
                                        BRANDING PREVIEW
                                    </div>
                                    <h2 className="text-2xl font-black">{theme.welcome_title}</h2>
                                    <p className="text-xs text-slate-500 max-w-xs mx-auto">{theme.welcome_description}</p>
                                </div>

                            <div className="px-6 py-4 flex-1 space-y-6">
                                {/* Step indicator mockup */}
                                <div className="flex gap-2">
                                    <div className="h-1 rounded-full flex-1" style={{ backgroundColor: theme.primary_color }} />
                                    <div className="h-1 rounded-full flex-1 bg-slate-100" />
                                    <div className="h-1 rounded-full flex-1 bg-slate-100" />
                                </div>

                                <div className="space-y-3">
                                    <div className="h-4 bg-slate-50 border-l-4 w-32" style={{ borderLeftColor: theme.primary_color }} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="h-20 bg-slate-50 rounded-xl border-2 border-transparent" />
                                        <div className="h-20 bg-slate-50 rounded-xl border-2" style={{ borderColor: theme.primary_color }} />
                                    </div>
                                </div>

                                <div className="space-y-3 mt-auto">
                                    <Button
                                        className="w-full h-12 rounded-xl text-white font-bold"
                                        style={{ backgroundColor: theme.primary_color }}
                                    >
                                        予約を確定する
                                    </Button>
                                    <div className="h-2 bg-slate-50 rounded w-1/2 mx-auto" />
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-[10px] text-slate-400 font-medium italic">
                        ※ プレビューはレイアウトのイメージです。実際の表示とは多少異なる場合があります。
                    </p>
                </div>
            </div>
        </div>
    );
}
