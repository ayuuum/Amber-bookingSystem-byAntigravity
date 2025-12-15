"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, CalendarCheck, TrendingUp } from "lucide-react";

import { motion } from "framer-motion";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function AdminDashboard() {
    return (
        <div className="p-8 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
                <p className="text-muted-foreground">ビジネスのパフォーマンス概要。</p>
            </div>

            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={container}
                initial="hidden"
                animate="show"
            >
                <Card variants={item}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">総売上</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">¥452,000</div>
                        <p className="text-xs text-muted-foreground">先月比 +20.1%</p>
                    </CardContent>
                </Card>
                <Card variants={item}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">予約数</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+54</div>
                        <p className="text-xs text-muted-foreground">前日比 +12</p>
                    </CardContent>
                </Card>
                <Card variants={item}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">稼働中のサービス</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-xs text-muted-foreground">トップ: エアコン</p>
                    </CardContent>
                </Card>
                <Card variants={item}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">承認待ち</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">7</div>
                        <p className="text-xs text-muted-foreground">要対応</p>
                    </CardContent>
                </Card>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>最近の予約</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Mock List */}
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium">予約番号 #{1000 + i}</p>
                                        <p className="text-sm text-muted-foreground">エアコンクリーニング</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">¥12,000</p>
                                        <p className="text-xs text-muted-foreground">2024-12-15</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>今日のスケジュール</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-100 text-blue-800 p-2 rounded text-xs font-bold w-16 text-center">09:00</div>
                                <div>
                                    <p className="font-medium">田中 健</p>
                                    <p className="text-xs text-muted-foreground">キッチンクリーニング</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-100 text-blue-800 p-2 rounded text-xs font-bold w-16 text-center">13:00</div>
                                <div>
                                    <p className="font-medium">鈴木 さくら</p>
                                    <p className="text-xs text-muted-foreground">エアコンクリーニング x2</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
