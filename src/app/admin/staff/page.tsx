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
} from "@/components/ui/dialog"
import { PlusCircle, Shield, User, Store, Mail, Phone, MoreHorizontal, Settings } from 'lucide-react';
import { Profile, Store as StoreType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_LABELS: Record<string, { label: string, color: string, icon: any }> = {
    org_admin: { label: '組織管理者', color: 'bg-slate-900', icon: Shield },
    store_manager: { label: '店長', color: 'bg-amber-600', icon: Store },
    staff: { label: 'スタッフ', color: 'bg-emerald-600', icon: User },
    customer: { label: '顧客', color: 'bg-slate-400', icon: User }
};

export default function AdminStaffPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [stores, setStores] = useState<StoreType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff', store_id: '' });

    const supabase = createClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile?.organization_id) return;

        // Fetch all users in org
        const { data: members } = await supabase
            .from('profiles')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .order('role', { ascending: true });

        // Fetch stores for manager assignment
        const { data: storeList } = await supabase
            .from('stores')
            .select('*')
            .eq('organization_id', profile.organization_id);

        if (members) setUsers(members as Profile[]);
        if (storeList) setStores(storeList as StoreType[]);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInvite = async () => {
        if (!inviteForm.email) return;
        // In a real app, this calls an API to send invite or create user
        alert(`招待を送信しました: ${inviteForm.email} (${inviteForm.role})\n※ JWT同期トリガーにより次回ログイン時から権限が有効になります。`);
        setIsInviteOpen(false);
        setInviteForm({ email: '', role: 'staff', store_id: '' });
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-amber-600 font-bold uppercase tracking-widest text-sm">Loading Members...</div>
        </div>
    );

    return (
        <div className="container mx-auto p-8 max-w-6xl space-y-12 bg-white">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-10 bg-amber-500 rounded-full" />
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">ユーザー・権限管理</h1>
                    </div>
                    <p className="text-slate-500 font-medium tracking-tight">組織のメンバーとアクセス権限を一元管理します。</p>
                </div>
                <Button onClick={() => setIsInviteOpen(true)} className="rounded-xl h-12 px-6 font-bold bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200">
                    <PlusCircle className="mr-2 h-5 w-5" /> メンバーを招待
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {users.map((member) => {
                    const RoleIcon = ROLE_LABELS[member.role]?.icon || User;
                    return (
                        <Card key={member.id} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <CardHeader className="pb-4 relative">
                                <div className="absolute top-6 right-6">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                                <MoreHorizontal className="w-5 h-5 text-slate-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2 w-48">
                                            <DropdownMenuLabel className="font-bold text-slate-400 text-[10px] uppercase px-3 py-2">Account Actions</DropdownMenuLabel>
                                            <DropdownMenuItem className="rounded-xl font-bold py-2.5 focus:bg-slate-50 cursor-pointer">
                                                権限を編集
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="rounded-xl font-bold py-2.5 focus:bg-slate-50 cursor-pointer">
                                                店舗紐付け
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-slate-50 mx-1" />
                                            <DropdownMenuItem className="rounded-xl font-bold py-2.5 focus:bg-red-50 text-red-500 cursor-pointer">
                                                組織から削除
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl ${ROLE_LABELS[member.role]?.color} flex items-center justify-center text-white shadow-lg`}>
                                        <RoleIcon className="w-7 h-7" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{member.full_name || '名称未設定'}</h3>
                                        <Badge className={`${ROLE_LABELS[member.role]?.color} text-white border-none rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-widest`}>
                                            {ROLE_LABELS[member.role]?.label}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>Email Address</span>
                                    </div>
                                    <div className="text-slate-600 font-medium truncate">{member.email}</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>Phone Number</span>
                                    </div>
                                    <div className="text-slate-600 font-medium">{member.phone || '未登録'}</div>
                                </div>
                                {member.role === 'store_manager' && (
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] uppercase font-black text-amber-600 tracking-widest">Assigned Store</span>
                                            <Settings className="w-3.5 h-3.5 text-amber-400 cursor-pointer" />
                                        </div>
                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                            <Store className="w-4 h-4 text-amber-500" />
                                            {member.store_id ? stores.find(s => s.id === member.store_id)?.name : '店舗未割り当て'}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
                    <DialogHeader className="space-y-4">
                        <div className="w-12 h-12 bg-amber-100 flex items-center justify-center rounded-2xl">
                            <PlusCircle className="w-6 h-6 text-amber-600" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">メンバーを招待</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500 leading-relaxed">
                            新しいメンバーを組織に招待し、適切な権限を割り当てます。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                            <Input
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                placeholder="name@example.com"
                                className="h-12 rounded-xl border-slate-200 focus:ring-amber-500 focus:border-amber-500 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Access Role</Label>
                            <Select value={inviteForm.role} onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}>
                                <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                    <SelectItem value="staff" className="font-bold py-3 rounded-xl focus:bg-slate-50">スタッフ（自分の予約のみ）</SelectItem>
                                    <SelectItem value="store_manager" className="font-bold py-3 rounded-xl focus:bg-slate-50">店長（特定店舗の全管理）</SelectItem>
                                    <SelectItem value="org_admin" className="font-bold py-3 rounded-xl focus:bg-slate-50 text-amber-600">組織管理者（全店舗の全権限）</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {inviteForm.role === 'store_manager' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Assign Store</Label>
                                <Select value={inviteForm.store_id} onValueChange={(val) => setInviteForm({ ...inviteForm, store_id: val })}>
                                    <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold">
                                        <SelectValue placeholder="担当店舗を選択" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                                        {stores.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="font-bold py-3 rounded-xl focus:bg-slate-50">{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleInvite} className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 font-black text-white text-lg shadow-lg shadow-amber-200 transition-all active:scale-[0.98]">
                            招待メールを送信する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
