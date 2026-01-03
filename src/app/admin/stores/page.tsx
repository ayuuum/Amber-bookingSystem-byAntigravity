"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Store } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Plus, Store as StoreIcon } from "lucide-react";

export default function StoresPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        address: "",
    });
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const { toast } = useToast();

    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const handleNameChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            name: value,
            slug: prev.slug || generateSlug(value)
        }));
    };

    const fetchStores = async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            // Network errors should not trigger state updates
            if (userError) {
                if (userError.message?.includes('Failed to fetch') || 
                    userError.message?.includes('NetworkError') ||
                    userError.name === 'NetworkError') {
                    console.error('[StoresPage] Network error during auth check:', userError.message);
                    setLoading(false);
                    return;
                }
            }

            if (!user) {
                setLoading(false);
                return;
            }

            // 1. Get User Org
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            // Network errors on profile fetch should not trigger state updates
            if (profileError) {
                if (profileError.message?.includes('Failed to fetch') || 
                    profileError.message?.includes('NetworkError')) {
                    console.error('[StoresPage] Network error during profile check:', profileError.message);
                    setLoading(false);
                    return;
                }
            }

            if (!profile?.organization_id) {
                setLoading(false);
                return;
            }

            // 2. Get Stores
            const { data, error: storesError } = await supabase
                .from('stores')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: true });

            // Network errors on stores fetch should not trigger state updates
            if (storesError) {
                if (storesError.message?.includes('Failed to fetch') || 
                    storesError.message?.includes('NetworkError')) {
                    console.error('[StoresPage] Network error during stores fetch:', storesError.message);
                    setLoading(false);
                    return;
                }
            }

            if (data) setStores(data as Store[]);
        } catch (error: any) {
            // Catch network errors and other unexpected errors
            if (error?.message?.includes('Failed to fetch') || 
                error?.name === 'TypeError' ||
                error?.message?.includes('network')) {
                console.error('[StoresPage] Network error during fetch:', error.message);
            } else {
                console.error('[StoresPage] Failed to fetch stores:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let hasFetched = false; // Prevent multiple simultaneous fetches

        const doFetch = async () => {
            if (hasFetched) return;
            hasFetched = true;
            await fetchStores();
        };

        doFetch();

        return () => {
            isMounted = false;
        };
    }, [supabase]);

    const handleOpenDialog = () => {
        setFormData({ name: "", slug: "", address: "" });
        setError(null);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setFormData({ name: "", slug: "", address: "" });
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/stores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    slug: formData.slug || generateSlug(formData.name),
                    address: formData.address,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // エラーレスポンスは { error: { code, message, details } } の形式
                const errorMessage = data.error?.message || (typeof data.error === 'string' ? data.error : '店舗の作成に失敗しました');
                throw new Error(errorMessage);
            }

            toast({
                title: "店舗を作成しました",
                description: `${formData.name} を正常に追加しました。`,
            });

            handleCloseDialog();
            await fetchStores();
        } catch (err: any) {
            setError(err.message || '予期せぬエラーが発生しました');
            toast({
                title: "エラー",
                description: err.message || '店舗の作成に失敗しました',
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto p-8 max-w-5xl space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">店舗管理</h1>
                    <p className="text-muted-foreground">組織に所属する店舗を管理します</p>
                </div>
                <Button onClick={handleOpenDialog}>
                    <Plus className="mr-2 h-4 w-4" /> 店舗を追加
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map(store => (
                    <Card key={store.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-bold">{store.name}</CardTitle>
                            <StoreIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground mb-4">
                                {store.address || "住所未設定"}
                            </div>
                            <div className="flex justify-end">
                                <Link href={`/admin/stores/${store.id}`}>
                                    <Button variant="outline" size="sm">設定・編集</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {stores.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                        <p className="text-muted-foreground">店舗データがありません</p>
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>新規店舗を追加</DialogTitle>
                        <DialogDescription>
                            新しい店舗の情報を入力してください。
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">店舗名 *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="例：本店"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">スラッグ（URL用） *</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                placeholder="例：main-store"
                                pattern="[a-z0-9\-]+"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                英数字とハイフンのみ使用可能。店舗の予約ページのURLに使用されます。
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">住所</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                placeholder="例：東京都渋谷区..."
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseDialog}
                                disabled={isSubmitting}
                            >
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.slug}>
                                {isSubmitting ? '作成中...' : '店舗を作成'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
