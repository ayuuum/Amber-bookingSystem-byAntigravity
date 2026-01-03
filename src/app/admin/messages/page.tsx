"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatWindow } from '@/components/features/chat/ChatWindow';
import { MessageSquare, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Customer {
    id: string;
    full_name: string;
    line_user_id: string;
    last_message?: string;
}

export default function AdminChatPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const supabase = createClient();

    useEffect(() => {
        const fetchCustomers = async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('id, full_name, line_user_id')
                .not('line_user_id', 'is', null)
                .order('full_name');

            if (data) setCustomers(data);
        };
        fetchCustomers();
    }, [supabase]);

    const filteredCustomers = customers.filter(c =>
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold tracking-tight mb-8">LINE メッセージ</h2>

            <div className="grid grid-cols-12 gap-6 h-[700px]">
                {/* Customer List */}
                <Card className="col-span-4 flex flex-col">
                    <CardHeader className="py-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="顧客を検索..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            {filteredCustomers.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    対象のユーザーが見つかりません
                                </div>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <button
                                        key={customer.id}
                                        onClick={() => setSelectedCustomer(customer)}
                                        className={`w-full p-4 flex items-center gap-3 border-b hover:bg-gray-50 transition-colors ${selectedCustomer?.id === customer.id ? 'bg-amber-50 border-r-4 border-r-amber-500' : ''
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                            <User size={20} />
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className="font-semibold truncate">{customer.full_name}</p>
                                            <p className="text-xs text-muted-foreground truncate">LINE 連携中</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <div className="col-span-8 h-full">
                    {selectedCustomer ? (
                        <ChatWindow
                            customerId={selectedCustomer.id}
                            customerName={selectedCustomer.full_name}
                        />
                    ) : (
                        <Card className="h-full flex items-center justify-center bg-gray-50/30 border-dashed">
                            <div className="text-center text-muted-foreground">
                                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                                <p>顧客を選択してチャットを開始してください</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
