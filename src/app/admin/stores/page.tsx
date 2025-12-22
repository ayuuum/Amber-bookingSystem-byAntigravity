"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Store } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Store as StoreIcon } from "lucide-react";

export default function StoresPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchStores = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get User Org
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            if (!profile?.organization_id) {
                setLoading(false);
                return;
            }

            // 2. Get Stores
            const { data } = await supabase
                .from('stores')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: true });

            if (data) setStores(data as Store[]);
            setLoading(false);
        };
        fetchStores();
    }, []);

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto p-8 max-w-5xl space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">店舗管理</h1>
                    <p className="text-muted-foreground">組織に所属する店舗を管理します</p>
                </div>
                {/* <Button>
                    <Plus className="mr-2 h-4 w-4" /> 店舗を追加 (v1.2)
                </Button> */}
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
        </div>
    );
}
