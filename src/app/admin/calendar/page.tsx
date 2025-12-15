"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Mock checking dates with bookings
    const bookings = [
        new Date(2024, 11, 15), // Dec 15
        new Date(2024, 11, 16),
        new Date(2024, 11, 20),
    ];

    return (
        <div className="p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">カレンダー</h2>
                <p className="text-muted-foreground">スケジュールと空き状況を確認します。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>日付を選択</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                            modifiers={{
                                booked: bookings
                            }}
                            modifiersStyles={{
                                booked: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>{date ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日のスケジュール` : "日付を選択してください"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Mock Logic */}
                            {date && bookings.some(b => b.getDate() === date.getDate() && b.getMonth() === date.getMonth()) ? (
                                <div className="p-4 border rounded-lg bg-slate-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-lg">09:00 - 11:00</span>
                                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">確定済み</span>
                                    </div>
                                    <p className="font-medium">田中 恵子</p>
                                    <p className="text-sm text-gray-500">エアコンクリーニング</p>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">この日の予約はありません。</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
