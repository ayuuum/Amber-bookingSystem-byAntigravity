"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, CheckCircle2, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Invitation {
    id: string;
    email: string;
    role: string;
    store_id: string | null;
    store: { id: string; name: string } | null;
    invited_by: string;
    inviter: { id: string; email: string } | null;
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
    store_admin: '店舗管理者',
    field_staff: '現場スタッフ',
};

export default function InvitesPage() {
    const [loading, setLoading] = useState(true);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchInvitations();
    }, []);

    const fetchInvitations = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/invites');
            if (res.ok) {
                const data = await res.json();
                setInvitations(data.invitations || []);
            } else {
                throw new Error('招待一覧の取得に失敗しました');
            }
        } catch (error: any) {
            console.error('Error fetching invitations:', error);
            toast({
                title: "エラー",
                description: error.message || "招待一覧の取得に失敗しました",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async () => {
        if (!invitationToDelete) return;

        try {
            const res = await fetch(`/api/admin/invites/${invitationToDelete}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('招待の取り消しに失敗しました');
            }

            toast({
                title: "成功",
                description: "招待を取り消しました",
                variant: "default",
            });

            setDeleteDialogOpen(false);
            setInvitationToDelete(null);
            fetchInvitations();
        } catch (error: any) {
            toast({
                title: "エラー",
                description: error.message || "招待の取り消しに失敗しました",
                variant: "destructive",
            });
        }
    };

    const getStatus = (invitation: Invitation) => {
        if (invitation.accepted_at) {
            return { label: '承認済み', variant: 'default' as const, icon: CheckCircle2 };
        }
        if (new Date(invitation.expires_at) < new Date()) {
            return { label: '期限切れ', variant: 'destructive' as const, icon: XCircle };
        }
        return { label: '未承認', variant: 'secondary' as const, icon: Clock };
    };

    if (loading) {
        return <LoadingState message="招待一覧を読み込み中..." />;
    }

    const pendingInvitations = invitations.filter(
        (inv) => !inv.accepted_at && new Date(inv.expires_at) >= new Date()
    );
    const acceptedInvitations = invitations.filter((inv) => inv.accepted_at);
    const expiredInvitations = invitations.filter(
        (inv) => !inv.accepted_at && new Date(inv.expires_at) < new Date()
    );

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900">招待管理</h1>
                <p className="text-neutral-500 mt-2">送信済み招待の一覧と管理</p>
            </header>

            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">未承認</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">
                            {pendingInvitations.length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">承認済み</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                            {acceptedInvitations.length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">期限切れ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                            {expiredInvitations.length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 招待一覧 */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">送信済み招待一覧</CardTitle>
                            <CardDescription className="font-medium text-slate-500 mt-1">
                                全{invitations.length}件の招待
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {invitations.length === 0 ? (
                        <div className="p-12 text-center text-neutral-500">
                            <Mail className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                            <p className="font-medium">送信済み招待はありません</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-neutral-50 text-neutral-500 text-sm border-b border-neutral-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">メールアドレス</th>
                                        <th className="px-6 py-4 font-bold">役割</th>
                                        <th className="px-6 py-4 font-bold">店舗</th>
                                        <th className="px-6 py-4 font-bold">ステータス</th>
                                        <th className="px-6 py-4 font-bold">有効期限</th>
                                        <th className="px-6 py-4 font-bold">送信日</th>
                                        <th className="px-6 py-4 text-center font-bold">アクション</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {invitations.map((invitation) => {
                                        const status = getStatus(invitation);
                                        const StatusIcon = status.icon;
                                        const isExpired = new Date(invitation.expires_at) < new Date();
                                        const isAccepted = !!invitation.accepted_at;

                                        return (
                                            <tr key={invitation.id} className="hover:bg-neutral-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-neutral-900">
                                                    {invitation.email}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                                                        {ROLE_LABELS[invitation.role] || invitation.role}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-neutral-600">
                                                    {invitation.store?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                                                        <StatusIcon className="w-3 h-3" />
                                                        {status.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-neutral-600 text-sm">
                                                    {format(new Date(invitation.expires_at), 'yyyy年MM月dd日', { locale: ja })}
                                                </td>
                                                <td className="px-6 py-4 text-neutral-600 text-sm">
                                                    {format(new Date(invitation.created_at), 'yyyy年MM月dd日', { locale: ja })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {!isAccepted && !isExpired && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    // TODO: Implement resend functionality
                                                                    toast({
                                                                        title: "再送信機能",
                                                                        description: "再送信機能は今後実装予定です",
                                                                        variant: "default",
                                                                    });
                                                                }}
                                                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {!isAccepted && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setInvitationToDelete(invitation.id);
                                                                    setDeleteDialogOpen(true);
                                                                }}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 削除確認ダイアログ */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>招待を取り消しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            この操作は取り消せません。招待リンクは無効になります。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setInvitationToDelete(null)}>
                            キャンセル
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            取り消す
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

