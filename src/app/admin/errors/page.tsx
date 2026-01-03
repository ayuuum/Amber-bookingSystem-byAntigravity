'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ErrorLog {
    id: string;
    createdAt: string;
    errorCode: string;
    errorMessage: string;
    bookingId: string;
    metadata: Record<string, unknown>;
}

export default function AdminErrorsPage() {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchErrorLogs();
    }, []);

    const fetchErrorLogs = async () => {
        try {
            const res = await fetch('/api/admin/errors');
            const data = await res.json();

            if (res.ok) {
                setLogs(data.logs || []);
            } else {
                // audit_logsテーブルが存在しない場合は正常な空状態として扱う（未実装機能）
                const errorMessage = data.error?.message || data.error || '';
                if (typeof errorMessage === 'string' && (
                    errorMessage.includes('Could not find the table') ||
                    (errorMessage.includes('relation') && errorMessage.includes('does not exist'))
                )) {
                    // テーブル未存在は正常な状態として扱う（未実装機能）
                    // console.errorは出さない
                    setLogs([]);
                    return;
                }
                // ネットワーク断など本当に致命的な場合のみconsole.error
                console.error('Failed to fetch error logs:', data.error);
            }
        } catch (error) {
            // ネットワーク断など本当に致命的な場合のみconsole.error
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">エラーログ</h1>
                <p className="text-sm text-muted-foreground">直近30日間の予約失敗ログ</p>
            </div>

            {logs.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        エラーログはありません
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <Card key={log.id} className="border-l-4 border-l-red-500">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                        <div>
                                            <CardTitle className="text-lg">{log.errorMessage}</CardTitle>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {format(new Date(log.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        {log.errorCode}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-semibold">予約ID:</span> {log.bookingId}
                                    </div>
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                        <div>
                                            <span className="font-semibold">詳細:</span>
                                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}






