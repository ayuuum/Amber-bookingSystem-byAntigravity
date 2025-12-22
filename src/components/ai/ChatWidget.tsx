'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage]
                })
            });

            if (!response.ok) throw new Error(response.statusText);

            // Note: Simplification - we just read the text.
            // For proper streaming, we'd use a reader. for MVP, text() is fine if streaming isn't critical
            // BUT user expects streaming. Let's try basic reader.

            // However, AI SDK returns a stream of parts (text, tool calls). 
            // Reading it as text might result in weird protocol strings if we used toDataStreamResponse().
            // If we use toDataStreamResponse, the client must parse the complex stream.
            // Since we are manual, request route.ts to return SIMPLE TEXT if possible? 
            // No, route.ts uses standard streamText.

            // Hack: Route.ts returns toDataStreamResponse().
            // If we just displayText on client manual implementation, we might see tool call JSONs.
            // This is acceptable for MVP debugging but not ideal.
            // To fix this simple, we rely on the fact that for simple Q&A, it streams text mostly.
            // Let's implement a simple text accumulator.

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: ''
                };
                setMessages(prev => [...prev, assistantMessage]);

                let fullContent = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    // Vercel AI Data Stream format is complex (0:"text", etc).
                    // If we blindly display it, it will look like `0:"Hello"`
                    // We need to parse it. 
                    // Protocol: '0: "text"\n'

                    // Simple parser for 0: prefix
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('0:')) {
                            try {
                                const text = JSON.parse(line.slice(2).trim());
                                fullContent += text;
                            } catch (e) {
                                // ignore parse error (maybe incomplete line)
                            }
                        }
                    }

                    setMessages(prev => prev.map(m =>
                        m.id === assistantMessage.id
                            ? { ...m, content: fullContent }
                            : m
                    ));
                }
            }

        } catch (error) {
            console.error('Chat error:', error);
            // Add error message
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'すみません、エラーが発生しました。' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-4">
            {isOpen && (
                <Card className="w-[350px] h-[500px] shadow-xl flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <CardHeader className="p-4 flex flex-row justify-between items-center border-b">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">予約アシスタント (Beta)</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <div className="h-full overflow-y-auto p-4" ref={scrollRef}>
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground mt-10 text-sm px-4">
                                    <p>こんにちは！👋</p>
                                    <p className="mt-2">あんばーはうすの予約アシスタントです。</p>
                                    <p>「エアコン掃除の料金は？」</p>
                                    <p>「明日の空き状況を教えて」</p>
                                    <p>など、お気軽にご相談ください。</p>
                                </div>
                            )}
                            <div className="space-y-4">
                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={cn(
                                            "flex w-full items-start gap-2",
                                            m.role === 'user' ? "flex-row-reverse" : "flex-row"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "rounded-full p-2 h-8 w-8 flex items-center justify-center shrink-0",
                                                m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                                            )}
                                        >
                                            {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>
                                        <div
                                            className={cn(
                                                "rounded-lg px-3 py-2 text-sm max-w-[80%]",
                                                m.role === 'user'
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-foreground"
                                            )}
                                        >
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex w-full items-start gap-2">
                                        <div className="bg-muted rounded-full p-2 h-8 w-8 flex items-center justify-center shrink-0">
                                            <Bot className="h-4 w-4" />
                                        </div>
                                        <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm">
                                            <span className="animate-pulse">考え中...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-3 border-t bg-background">
                        <form onSubmit={handleSubmit} className="flex w-full gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="メッセージを入力..."
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-110"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </Button>
        </div>
    );
}
