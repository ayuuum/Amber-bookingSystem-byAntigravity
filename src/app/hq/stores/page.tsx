"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Plus, Building2 } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

interface StoreWithOrg {
    id: string;
    name: string;
    slug: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    is_archived: boolean;
    created_at: string;
    organization: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

interface Organization {
    id: string;
    name: string;
    slug: string;
}

export default function HQStoresPage() {
    const [loading, setLoading] = useState(true);
    const [stores, setStores] = useState<StoreWithOrg[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        organization_id: '',
        name: '',
        slug: '',
        address: '',
        phone: '',
        email: '',
    });
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch stores
            const storesRes = await fetch('/api/hq/stores');
            if (storesRes.ok) {
                const storesData = await storesRes.json();
                setStores(storesData.stores || []);
            }

            // Fetch organizations
            const { data: orgs } = await supabase
                .from('organizations')
                .select('id, name, slug')
                .order('name', { ascending: true });

            if (orgs) {
                setOrganizations(orgs);
            }
        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast({
                title: "エラー",
                description: "データの取得に失敗しました",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/hq/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '店舗の作成に失敗しました');
            }

            toast({
                title: "成功",
                description: "店舗が正常に作成されました",
                variant: "default",
            });

            setIsDialogOpen(false);
            setFormData({
                organization_id: '',
                name: '',
                slug: '',
                address: '',
                phone: '',
                email: '',
            });
            fetchData();
        } catch (error: any) {
            toast({
                title: "エラー",
                description: error.message || "店舗の作成に失敗しました",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <LoadingState message="店舗データを読み込み中..." />;
    }

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">店舗管理</h1>
                    <p className="text-neutral-500 mt-2">全店舗の一覧と管理</p>
                </div>
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-200"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    新規店舗を作成
                </Button>
            </header>

            {/* 店舗一覧 */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">全店舗一覧</CardTitle>
                            <CardDescription className="font-medium text-slate-500 mt-1">
                                組織別の店舗一覧
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            {stores.length}店舗
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {stores.length === 0 ? (
                        <div className="p-12 text-center text-neutral-500">
                            <Store className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                            <p className="font-medium">店舗が登録されていません</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-neutral-50 text-neutral-500 text-sm border-b border-neutral-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">店舗名</th>
                                        <th className="px-6 py-4 font-bold">組織</th>
                                        <th className="px-6 py-4 font-bold">スラッグ</th>
                                        <th className="px-6 py-4 font-bold">住所</th>
                                        <th className="px-6 py-4 font-bold">電話番号</th>
                                        <th className="px-6 py-4 text-center font-bold">ステータス</th>
                                        <th className="px-6 py-4 text-center font-bold">作成日</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {stores.map((store) => (
                                        <tr key={store.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-neutral-900">
                                                {store.name}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-700">
                                                {store.organization?.name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-600 font-mono text-sm">
                                                {store.slug || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-600 text-sm">
                                                {store.address || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-600">
                                                {store.phone || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        store.is_archived
                                                            ? 'bg-red-100 text-red-700 border-red-200'
                                                            : 'bg-green-100 text-green-700 border-green-200'
                                                    }
                                                >
                                                    {store.is_archived ? 'アーカイブ済み' : 'アクティブ'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center text-neutral-500 text-sm">
                                                {new Date(store.created_at).toLocaleDateString('ja-JP')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 新規店舗作成ダイアログ */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">新規店舗を作成</DialogTitle>
                        <DialogDescription>
                            新しい店舗を登録します。組織を選択して店舗情報を入力してください。
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="organization_id">組織 *</Label>
                                <Select
                                    value={formData.organization_id}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, organization_id: value }))}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="組織を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations.map((org) => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">店舗名 *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="例: Amber 新宿店"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">スラッグ *</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="例: shinjuku"
                                    required
                                />
                                <p className="text-xs text-neutral-500">URLに使用される識別子（英数字とハイフンのみ）</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">住所</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="例: 東京都新宿区..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">電話番号</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="例: 03-1234-5678"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">メールアドレス</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="例: store@example.com"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={isSubmitting}
                            >
                                キャンセル
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                {isSubmitting ? '作成中...' : '作成'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

