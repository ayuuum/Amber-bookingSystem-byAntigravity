'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle, Pencil, Trash2, Clock, JapaneseYen } from 'lucide-react';

export type Option = {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
};

type Service = {
    id: string;
    title: string;
    duration_minutes: number;
    price: number;
    options?: Option[]; // Joined data
};

export default function AdminServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({ title: '', duration_minutes: 60, price: 10000 });

    // Option Form State
    const [newOption, setNewOption] = useState({ name: '', price: 0, duration_minutes: 0 });

    const supabase = createClient();

    const fetchServices = useCallback(async () => {
        const { data } = await fetch('/api/services').then(res => res.json());
        if (data && !data.error) setServices(data);
        else if (Array.isArray(data)) setServices(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleOpenDialog = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData({
                title: service.title,
                duration_minutes: service.duration_minutes,
                price: service.price
            });
        } else {
            setEditingService(null);
            setFormData({ title: '', duration_minutes: 60, price: 10000 });
        }
        setNewOption({ name: '', price: 3000, duration_minutes: 15 }); // Reset option form
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title) return;

        // Get Store ID (MVP)
        const { data: store } = await supabase.from('stores').select('id').limit(1).single();
        if (!store) {
            alert('店舗情報が見つかりません');
            return;
        }

        const payload = {
            id: editingService?.id,
            store_id: store.id,
            title: formData.title,
            duration_minutes: formData.duration_minutes,
            price: formData.price
        };

        const res = await fetch('/api/services', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setIsDialogOpen(false);
            setLoading(true);
            fetchServices();
        } else {
            console.error("Failed to save service");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？')) return;
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) alert('削除できませんでした。予約で使用されている可能性があります。');
        else {
            setLoading(true);
            fetchServices();
        }
    };

    // Option Handlers
    const handleAddOption = async () => {
        if (!editingService || !newOption.name) return;

        const res = await fetch('/api/services/options', {
            method: 'POST',
            body: JSON.stringify({
                service_id: editingService.id,
                ...newOption
            })
        });

        if (res.ok) {
            // Refresh services to show new option
            // Ideally assume success and update local state to avoid full refetch, but full refetch is safer for MVP
            await fetchServices();
            // Re-find the editing service to update the displayed list in dialog? 
            // The dialog depends on `editingService` state which is stale.
            // We need to update `editingService` with the new data.
            // A pattern: update `services` list, then update `editingService` from that list.
            const updatedList = await fetch('/api/services').then(r => r.json());
            setServices(updatedList);
            const updatedService = updatedList.find((s: Service) => s.id === editingService.id);
            if (updatedService) setEditingService(updatedService);

            setNewOption({ name: '', price: 3000, duration_minutes: 15 });
        }
    };

    const handleDeleteOption = async (optionId: string) => {
        if (!confirm('オプションを削除しますか？')) return;
        await fetch(`/api/services/options?id=${optionId}`, { method: 'DELETE' });

        const updatedList = await fetch('/api/services').then(r => r.json());
        setServices(updatedList);
        const updatedService = updatedList.find((s: Service) => s.id === editingService!.id);
        if (updatedService) setEditingService(updatedService);
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto p-8 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">サービス管理</h1>
                    <p className="text-muted-foreground">提供するメニューの登録・編集を行います。</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> メニュー追加
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                    <Card key={service.id}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl">{service.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <Clock className="h-4 w-4 mr-2" />
                                    <span>{service.duration_minutes} 分</span>
                                </div>
                                <div className="flex items-center text-lg font-semibold text-gray-800">
                                    <JapaneseYen className="h-4 w-4 mr-2" />
                                    <span>{service.price.toLocaleString()}</span>
                                </div>
                                {service.options && service.options.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        オプション: {service.options.length}件
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenDialog(service)}>
                                    <Pencil className="h-4 w-4 mr-1" /> 編集
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:bg-red-50" onClick={() => handleDelete(service.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingService ? 'サービス編集' : 'サービス追加'}</DialogTitle>
                        <DialogDescription>メニュー内容を入力してください。</DialogDescription>
                    </DialogHeader>

                    {/* Basic Info */}
                    <div className="grid gap-4 py-4 border-b">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">サービス名</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="col-span-3"
                                placeholder="エアコンクリーニング"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">所要時間 (分)</Label>
                            <Input
                                type="number"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">料金 (円)</Label>
                            <Input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                        <Button onClick={handleSave} className="w-full mt-2">基本情報を保存</Button>
                    </div>

                    {/* Options Management (Only if editing) */}
                    {editingService && (
                        <div className="py-4">
                            <h3 className="font-bold mb-4">オプション (トッピング)</h3>

                            {/* Option List */}
                            <div className="space-y-2 mb-4 bg-gray-50 p-4 rounded text-sm">
                                {editingService.options?.map(opt => (
                                    <div key={opt.id} className="flex justify-between items-center bg-white p-2 rounded border">
                                        <span>{opt.name} (+¥{opt.price}) / {opt.duration_minutes}分</span>
                                        <Button variant="ghost" size="sm" className="text-red-500 h-6 w-6 p-0" onClick={() => handleDeleteOption(opt.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {(!editingService.options || editingService.options.length === 0) && (
                                    <p className="text-gray-400 text-center">オプションはありません</p>
                                )}
                            </div>

                            {/* Add Option Form */}
                            <div className="flex gap-2 items-end border-t pt-4">
                                <div className="grid gap-2 flex-1">
                                    <Label>オプション名</Label>
                                    <Input
                                        placeholder="例：防カビコート"
                                        value={newOption.name}
                                        onChange={e => setNewOption({ ...newOption, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2 w-24">
                                    <Label>料金</Label>
                                    <Input
                                        type="number"
                                        value={newOption.price}
                                        onChange={e => setNewOption({ ...newOption, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="grid gap-2 w-20">
                                    <Label>時間(分)</Label>
                                    <Input
                                        type="number"
                                        value={newOption.duration_minutes}
                                        onChange={e => setNewOption({ ...newOption, duration_minutes: Number(e.target.value) })}
                                    />
                                </div>
                                <Button onClick={handleAddOption} disabled={!newOption.name} variant="secondary">追加</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
