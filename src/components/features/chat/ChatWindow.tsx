"use client"

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Send, User, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
    id: string;
    sender_type: 'customer' | 'admin';
    content: string;
    created_at: string;
}

interface ChatWindowProps {
    customerId: string;
    customerName: string;
}

export function ChatWindow({ customerId, customerName }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const { toast } = useToast();

    // Fetch History
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/admin/chat/${customerId}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setMessages(data);
                }
            } catch (error) {
                console.error('Failed to fetch chat history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();

        // Subscribe to Realtime
        const channel = supabase
            .channel(`chat:${customerId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'line_messages',
                    filter: `customer_id=eq.${customerId}`
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [customerId, supabase]);

    // Auto Scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const content = inputValue;
        setInputValue('');

        try {
            const res = await fetch(`/api/admin/chat/${customerId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (!res.ok) {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: "メッセージの送信に失敗しました",
                description: "エラーが発生しました。もう一度お試しください。",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col h-[600px] border rounded-lg bg-white shadow-sm">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg">{customerName} 様</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        LINE 連携済み
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">読み込み中...</div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        メッセージのやり取りはまだありません。
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex gap-2 max-w-[80%] ${msg.sender_type === 'admin' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender_type === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {msg.sender_type === 'admin' ? <ShieldCheck size={16} /> : <User size={16} />}
                                    </div>
                                    <div>
                                        <div className={`p-3 rounded-2xl text-sm ${msg.sender_type === 'admin'
                                                ? 'bg-amber-600 text-white rounded-tr-none'
                                                : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                            }`}>
                                            {msg.content}
                                        </div>
                                        <div className={`text-[10px] text-muted-foreground mt-1 ${msg.sender_type === 'admin' ? 'text-right' : 'text-left'
                                            }`}>
                                            {format(new Date(msg.created_at), 'HH:mm', { locale: ja })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t flex gap-2">
                <Input
                    placeholder="メッセージを入力..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="flex-1"
                />
                <Button onClick={handleSend} className="bg-amber-600 hover:bg-amber-700">
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
