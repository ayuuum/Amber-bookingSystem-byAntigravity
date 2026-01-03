'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SystemEvent {
    id: string;
    event_type: string;
    entity_type: string;
    entity_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    queue_name: 'main' | 'dlq';
    retry_count: number;
    max_retries: number;
    error_message?: string;
    error_type?: string;
    created_at: string;
    processed_at?: string;
}

interface EventStats {
    queue: string;
    pending: number;
    processing: number;
    failed: number;
}

interface DLQResponse {
    events: SystemEvent[];
    total: number;
    errorTypeCounts: Record<string, number>;
}

export default function AdminEventsPage() {
    const [mainQueueStats, setMainQueueStats] = useState<EventStats | null>(null);
    const [dlqData, setDlqData] = useState<DLQResponse | null>(null);
    const [pendingEvents, setPendingEvents] = useState<SystemEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
        // 30秒ごとに自動更新
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // メインキューの統計を取得
            const statsRes = await fetch('/api/events/process?queue=main');
            if (statsRes.ok) {
                const stats = await statsRes.json();
                setMainQueueStats(stats);
            }

            // DLQデータを取得
            const dlqRes = await fetch('/api/events/dlq?limit=50');
            if (dlqRes.ok) {
                const dlq = await dlqRes.json();
                setDlqData(dlq);
            }

            // 未処理イベントを取得（簡易版）
            const eventsRes = await fetch('/api/events/process?queue=main');
            if (eventsRes.ok) {
                // 実際のイベント一覧は別APIで取得する必要があるが、今回は統計のみ
            }
        } catch (error) {
            console.error('Error fetching event data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessEvents = async () => {
        setProcessing(true);
        try {
            const res = await fetch('/api/events/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: 10 }),
            });
            if (res.ok) {
                await fetchData();
            }
        } catch (error) {
            console.error('Error processing events:', error);
        } finally {
            setProcessing(false);
        }
    };

    const handleDLQAction = async (eventId: string, action: 'retry' | 'delete') => {
        try {
            const res = await fetch('/api/events/dlq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, action }),
            });
            if (res.ok) {
                await fetchData();
            }
        } catch (error) {
            console.error('Error processing DLQ action:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />完了</Badge>;
            case 'processing':
                return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />処理中</Badge>;
            case 'failed':
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />失敗</Badge>;
            case 'pending':
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />待機中</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">イベント監視</h1>
                    <p className="text-sm text-muted-foreground">イベント処理状況とDLQの監視</p>
                </div>
                <Button onClick={handleProcessEvents} disabled={processing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                    イベント処理実行
                </Button>
            </div>

            {/* 統計カード */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">待機中イベント</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mainQueueStats?.pending || 0}</div>
                        <p className="text-xs text-muted-foreground">処理待ち</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">処理中イベント</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mainQueueStats?.processing || 0}</div>
                        <p className="text-xs text-muted-foreground">現在処理中</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">DLQ内イベント</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{dlqData?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">最大再試行回数超過</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="main" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="main">メインキュー</TabsTrigger>
                    <TabsTrigger value="dlq">Dead Letter Queue</TabsTrigger>
                </TabsList>

                <TabsContent value="main" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>メインキュー統計</CardTitle>
                            <CardDescription>通常のイベント処理キュー</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>待機中:</span>
                                    <span className="font-semibold">{mainQueueStats?.pending || 0}件</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>処理中:</span>
                                    <span className="font-semibold">{mainQueueStats?.processing || 0}件</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>失敗:</span>
                                    <span className="font-semibold">{mainQueueStats?.failed || 0}件</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="dlq" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dead Letter Queue</CardTitle>
                            <CardDescription>最大再試行回数を超えた失敗イベント</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {dlqData && dlqData.events.length === 0 ? (
                                <div className="py-10 text-center text-muted-foreground">
                                    DLQ内にイベントはありません
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* エラータイプ別統計 */}
                                    {dlqData && Object.keys(dlqData.errorTypeCounts).length > 0 && (
                                        <div className="mb-4 p-4 bg-muted rounded-lg">
                                            <h3 className="font-semibold mb-2">エラータイプ別統計</h3>
                                            <div className="space-y-1">
                                                {Object.entries(dlqData.errorTypeCounts).map(([type, count]) => (
                                                    <div key={type} className="flex justify-between text-sm">
                                                        <span>{type || 'UNKNOWN'}:</span>
                                                        <span className="font-semibold">{count}件</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* DLQイベント一覧 */}
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>イベントタイプ</TableHead>
                                                <TableHead>エンティティID</TableHead>
                                                <TableHead>ステータス</TableHead>
                                                <TableHead>再試行回数</TableHead>
                                                <TableHead>エラータイプ</TableHead>
                                                <TableHead>作成日時</TableHead>
                                                <TableHead>操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {dlqData?.events.map((event) => (
                                                <TableRow key={event.id}>
                                                    <TableCell className="font-medium">{event.event_type}</TableCell>
                                                    <TableCell className="text-xs font-mono">{event.entity_id.slice(0, 8)}...</TableCell>
                                                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                                                    <TableCell>
                                                        <span className="text-red-500">{event.retry_count}/{event.max_retries}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{event.error_type || 'UNKNOWN'}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {format(new Date(event.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDLQAction(event.id, 'retry')}
                                                            >
                                                                <RefreshCw className="h-3 w-3 mr-1" />
                                                                再試行
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleDLQAction(event.id, 'delete')}
                                                            >
                                                                <Trash2 className="h-3 w-3 mr-1" />
                                                                削除
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {dlqData && dlqData.events.length > 0 && (
                                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                                <div className="text-sm">
                                                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                                                        DLQ内に {dlqData.total} 件のイベントがあります
                                                    </p>
                                                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                                        これらのイベントは最大再試行回数を超えています。原因を確認し、必要に応じて再試行または削除してください。
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


