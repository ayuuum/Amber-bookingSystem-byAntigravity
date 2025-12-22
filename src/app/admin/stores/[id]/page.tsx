"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { Store } from "@/types";
import { useParams } from "next/navigation";

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

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [store, setStore] = useState<Store | null>(null);
    const [businessHours, setBusinessHours] = useState<any>({});

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
            alert('保存しました');
        } catch (e) {
            console.error(e);
            alert('保存に失敗しました');
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

    if (loading) return <div className="p-8">Loading...</div>;
    if (!store) return <div className="p-8">Store not found</div>;

    return (
        <div className="container mx-auto p-8 max-w-4xl space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">店舗編集: {store.name}</h1>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" /> 保存
                </Button>
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
        </div>
    );
}
