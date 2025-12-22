'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, differenceInDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Search } from 'lucide-react';
import { Profile, HouseAsset, Customer, Booking } from '@/types';
import { HouseAssetCard } from '@/components/features/customers/HouseAssetCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, History, User, Home, MapPin, Phone, Mail } from 'lucide-react';
import { BookingTimeline } from '@/components/features/customers/BookingTimeline';

type ExtendedCustomer = Customer & {
    last_visit?: string;
    visit_count?: number;
    total_spent?: number;
    bookings?: Booking[];
};

export default function AdminCustomersPage() {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<ExtendedCustomer[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Detail Dialog State
    const [selectedCustomer, setSelectedCustomer] = useState<ExtendedCustomer | null>(null);
    const [customerAssets, setCustomerAssets] = useState<HouseAsset[]>([]);
    const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const supabase = createClient();

    const fetchData = async () => {
        setLoading(true);

        const { data: customerData } = await supabase
            .from('customers')
            .select('*, full_name, bookings(id, start_time, total_amount, status)')
            .order('created_at', { ascending: false });

        if (customerData) {
            const enriched = customerData.map(c => {
                const completedBookings = c.bookings?.filter((b: any) => b.status === 'completed') || [];
                return {
                    ...c,
                    visit_count: completedBookings.length,
                    total_spent: completedBookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
                    last_visit: completedBookings.length > 0 ? completedBookings[0].start_time : undefined
                };
            });
            setCustomers(enriched);
            setFilteredCustomers(enriched);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Search Logic
    useEffect(() => {
        if (!searchQuery) {
            setFilteredCustomers(customers);
        } else {
            const lower = searchQuery.toLowerCase();
            const filtered = customers.filter(c =>
                (c.full_name && c.full_name.includes(searchQuery)) ||
                (c.phone && c.phone.includes(searchQuery)) ||
                (c.email && c.email.toLowerCase().includes(lower))
            );
            setFilteredCustomers(filtered);
        }
    }, [searchQuery, customers]);

    const handleCustomerClick = async (customer: ExtendedCustomer) => {
        setSelectedCustomer(customer);
        setIsDialogOpen(true);

        // Fetch Assets
        const { data: assets } = await supabase.from('house_assets').select('*').eq('customer_id', customer.id);
        setCustomerAssets(assets as HouseAsset[] || []);

        // Fetch ALL bookings for this customer (even across stores in this org)
        const { data: bookings } = await supabase
            .from('bookings')
            .select('*, services(title), staff(name), stores(name)')
            .eq('customer_id', customer.id)
            .order('start_time', { ascending: false });

        setCustomerBookings(bookings as any[] || []);
    };

    if (loading) return <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-slate-400 font-bold uppercase tracking-widest text-sm">Loading CRM...</div>
    </div>;

    return (
        <div className="container mx-auto p-8 max-w-6xl space-y-12 bg-white">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-8 bg-amber-500 rounded-full" />
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">顧客台帳</h1>
                    </div>
                    <p className="text-slate-500 font-medium">組織全体の顧客接点と住宅資産を一元管理します。</p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <Input
                        placeholder="名前、電話番号で検索..."
                        className="pl-11 h-12 rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500 transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="py-5 font-bold text-slate-700">顧客名</TableHead>
                                <TableHead className="font-bold text-slate-700">連絡先</TableHead>
                                <TableHead className="font-bold text-slate-700">最終訪問</TableHead>
                                <TableHead className="font-bold text-slate-700 text-right">累計LS</TableHead>
                                <TableHead className="font-bold text-slate-700 text-right">アクション</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.map(c => (
                                <TableRow key={c.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => handleCustomerClick(c)}>
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 transition-all">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold text-slate-800 text-base">{c.full_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="text-slate-600 font-medium text-sm">{c.phone}</div>
                                            <div className="text-slate-400 text-xs">{c.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-slate-600 font-medium">
                                            {c.last_visit ? format(new Date(c.last_visit), 'yyyy/MM/dd', { locale: ja }) : '未訪問'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="text-slate-900 font-black">¥{(c.total_spent || 0).toLocaleString()}</div>
                                        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{c.visit_count} visits</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" className="rounded-lg border-slate-200 font-bold hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200">詳細</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center text-slate-400 italic">
                                        一致する顧客データがありません。
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-5xl h-[85vh] overflow-y-auto p-0 border-none rounded-3xl shadow-2xl">
                    <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-32 -mt-32" />
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div className="space-y-4">
                                <div className="p-2 bg-amber-500 rounded-xl w-fit">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight">{selectedCustomer?.full_name} 様</h2>
                                    <div className="flex flex-wrap gap-4 mt-2 text-slate-400 font-medium">
                                        <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {selectedCustomer?.phone}</div>
                                        <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {selectedCustomer?.email}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
                                    <div className="text-amber-400 text-2xl font-black">¥{(selectedCustomer?.total_spent || 0).toLocaleString()}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-black mt-1">LTV (Total spent)</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[120px]">
                                    <div className="text-white text-2xl font-black">{selectedCustomer?.visit_count}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-black mt-1">Visits</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        {selectedCustomer && (
                            <Tabs defaultValue="history" className="w-full">
                                <TabsList className="flex bg-slate-100 p-1.5 rounded-xl w-fit mb-8">
                                    <TabsTrigger value="history" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold flex items-center gap-2">
                                        <History className="w-4 h-4" /> 訪問履歴
                                    </TabsTrigger>
                                    <TabsTrigger value="assets" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold flex items-center gap-2">
                                        <Home className="w-4 h-4" /> 家カルテ
                                    </TabsTrigger>
                                    <TabsTrigger value="info" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> 基本情報
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="history" className="mt-0 space-y-6">
                                    <BookingTimeline bookings={customerBookings} />
                                </TabsContent>

                                <TabsContent value="assets" className="mt-0 space-y-6">
                                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-slate-800">住宅設備情報 (家カルテ)</h3>
                                            <p className="text-xs text-slate-500 font-medium">清掃箇所のメーカーや型番、現在の状態を記録しています。</p>
                                        </div>
                                        <Button className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800"><PlusCircle className="mr-2 h-4 w-4" /> 資産を追加</Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {customerAssets.map(asset => (
                                            <HouseAssetCard key={asset.id} asset={asset} />
                                        ))}
                                        {customerAssets.length === 0 && (
                                            <div className="col-span-2 py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 space-y-4">
                                                <Home className="w-12 h-12 opacity-20" />
                                                <p className="font-bold text-sm italic">住宅設備のデータがありません。</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="info" className="mt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Address</Label>
                                                <div className="font-bold text-slate-800 text-lg flex items-start gap-2">
                                                    <MapPin className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
                                                    {selectedCustomer.address || '未登録'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Notes</Label>
                                                <div className="text-slate-600 font-medium leading-relaxed">{selectedCustomer.notes || '備考なし'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
