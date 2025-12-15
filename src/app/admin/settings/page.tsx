"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const checkConnection = async () => {
            const { data, error } = await supabase
                .from('stores')
                .select('google_refresh_token')
                .limit(1)
                .single();

            if (data && data.google_refresh_token) {
                setIsConnected(true);
            }
            setLoading(false);
        };
        checkConnection();
    }, [supabase]);

    const handleConnect = () => {
        window.location.href = '/api/auth/google';
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">設定 (Settings)</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Googleカレンダー連携</CardTitle>
                    <CardDescription>
                        管理者（店舗）のGoogleカレンダーと連携し、予約の同期を行います。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isConnected ? (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">連携済み</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Googleカレンダーとの連携は正常に設定されています。
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>未連携</AlertTitle>
                            <AlertDescription>
                                まだ連携されていません。予約同期のためには連携が必要です。
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="pt-4">
                        {!isConnected ? (
                            <Button onClick={handleConnect}>
                                Googleカレンダーと連携する
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={handleConnect}>
                                連携を再設定する (リフレッシュ)
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
