"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { bookingSchema, BookingFormData } from "./schema";
import { ServiceCart } from "./steps/ServiceCart";
import { DateSelection } from "./steps/DateSelection";
import { CustomerInfo } from "./steps/CustomerInfo";
import { StaffSelection } from "./steps/StaffSelection";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { CartItem } from "@/types/cart";
import { Service } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";

interface ThemeSettings {
    primary_color: string;
    accent_color: string;
    welcome_title: string;
    welcome_description: string;
    hero_title: string;
    hero_description: string;
    hero_background_image: string;
}

const DEFAULT_THEME: ThemeSettings = {
    primary_color: "#0a0a0a", // black
    accent_color: "#71717a",  // gray
    welcome_title: "サービス予約",
    welcome_description: "ご希望のメニューと日時を選択してください。最短1分で予約が完了します。",
    hero_title: "究極の「おもてなし」を、\nあなたの住まいに。",
    hero_description: "Amberは、技術とホスピタリティを極めた掃除代行サービスです。",
    hero_background_image: "/hero.png",
};

interface LineProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
}

interface BookingFormProps {
    orgSlug: string;
    storeSlug: string;
    lineProfile?: LineProfile | null;
    idToken?: string | null;
    onComplete?: (booking: any) => void;
}

export function BookingForm({ orgSlug, storeSlug, lineProfile, idToken, onComplete }: BookingFormProps) {
    const { cart, updateCartItem, addToCart, removeFromCart, setStoreSlug } = useCart();
    const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
    const [services, setServices] = useState<Service[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createClient();
    const { toast } = useToast();

    // storeSlugをコンテキストに設定
    useEffect(() => {
        setStoreSlug(storeSlug);
    }, [storeSlug, setStoreSlug]);

    // LINEプロフィールがある場合は顧客名を自動入力
    useEffect(() => {
        if (lineProfile?.displayName) {
            // displayNameを姓と名に分割（スペースで区切る、なければ全てを姓に）
            const nameParts = lineProfile.displayName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
                form.setValue('lastName', nameParts[0]);
                form.setValue('firstName', nameParts.slice(1).join(' '));
            } else {
                form.setValue('lastName', lineProfile.displayName);
                form.setValue('firstName', '');
            }
        }
    }, [lineProfile, form]);

    // カート更新関数（ServiceCartコンポーネント用）
    const handleUpdateCart = (newCart: CartItem[]) => {
        // カート全体を置き換える（各アイテムを更新）
        const currentCartMap = new Map(cart.map(item => [item.serviceId, item]));
        const newCartMap = new Map(newCart.map(item => [item.serviceId, item]));

        // 削除されたアイテムを処理
        currentCartMap.forEach((item, serviceId) => {
            if (!newCartMap.has(serviceId)) {
                removeFromCart(serviceId);
            }
        });

        // 追加・更新されたアイテムを処理
        newCartMap.forEach((item) => {
            if (currentCartMap.has(item.serviceId)) {
                updateCartItem(item);
            } else {
                addToCart(item);
            }
        });
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await fetch(`/api/booking-init?storeSlug=${storeSlug}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.theme) {
                        setTheme({ ...DEFAULT_THEME, ...data.theme });
                    }
                    if (data.services) {
                        setServices(data.services);
                    }
                    if (data.staff) {
                        setStaffList(data.staff);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch initial booking data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [storeSlug]);

    const form = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema) as any,
        defaultValues: {
            staffId: "none",
            notes: "",
            paymentMethod: "on_site",
        },
        mode: "onChange",
    });

    const onSubmit = async (data: BookingFormData) => {
        try {
            if (cart.length === 0) {
                toast({
                    title: "サービスを選択してください",
                    description: "予約するサービスをカートに追加してください。",
                    variant: "destructive",
                });
                return;
            }

            const payload = {
                ...data,
                date: data.date.toISOString(), // Keep as ISO for API
                cartItems: cart.map(item => ({
                    serviceId: item.serviceId,
                    quantity: item.quantity,
                    selectedOptions: item.selectedOptions
                })),
                storeSlug,
                orgSlug,
                slug: storeSlug, // Add slug specifically for existing API
                idToken: idToken || null, // IDトークンを追加
                line_user_id: lineProfile?.userId || null, // LINEユーザーIDを追加
            };

            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Booking failed');
            }

            // Handle Stripe Redirect if needed
            if (data.paymentMethod === 'online_card') {
                const checkoutRes = await fetch('/api/checkout/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: result.bookingId,
                        cartItems: cart,
                        storeSlug,
                        successUrl: `${window.location.origin}/booking/success?id=${result.bookingId}`,
                        cancelUrl: `${window.location.origin}/${orgSlug}/${storeSlug}`,
                    }),
                });
                const { url } = await checkoutRes.json();
                if (url) {
                    window.location.href = url;
                    return;
                }
            }

            toast({
                title: "予約が完了しました",
                description: "LINEで通知が届きます。",
                variant: "default",
            });

            // onCompleteコールバックが指定されている場合は呼び出す
            if (onComplete) {
                onComplete(result);
            } else {
                window.location.href = '/success';
            }
        } catch (error) {
            console.error("Booking Error:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            toast({
                title: "予約に失敗しました",
                description: message,
                variant: "destructive",
            });
        }
    };

    return (
        <div
            className="max-w-6xl mx-auto px-4 py-14 space-y-14 min-h-screen"
            style={{
                '--primary-color': theme.primary_color,
                '--accent-color': theme.accent_color,
            } as React.CSSProperties}
        >
            <header className="relative overflow-hidden rounded-3xl bg-card border border-border shadow-[var(--shadow-soft)] p-10">
                <div className="flex flex-col gap-3 relative z-10 text-center">
                    <span
                        className="inline-flex items-center justify-center text-[11px] font-semibold px-3 py-1 rounded-full tracking-[0.14em] uppercase border bg-white/70 backdrop-blur"
                        style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                    >
                        かんたん予約・最短1分
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                        {theme.welcome_title}
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
                        {theme.welcome_description}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-700">
                        <span className="px-3 py-1 rounded-full bg-white/80 border border-white/60">オンライン決済</span>
                        <span className="px-3 py-1 rounded-full bg-white/80 border border-white/60">LINE通知</span>
                        <span className="px-3 py-1 rounded-full bg-white/80 border border-white/60">キャンセルポリシー明示</span>
                    </div>
                </div>
            </header>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 lg:space-y-12">
                    {/* Menu Selection Section with Glassmorphism */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="glass-card rounded-3xl p-6 lg:p-10 space-y-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">
                                1
                            </div>
                            <div>
                                <h2 className="text-2xl lg:text-3xl font-black text-foreground">メニューを選択</h2>
                                <p className="text-sm text-muted-foreground font-medium mt-1">複数選択・オプション追加が可能です</p>
                            </div>
                        </div>
                        <ServiceCart
                            slug={storeSlug}
                            cart={cart}
                            onUpdateCart={handleUpdateCart}
                            initialServices={services}
                            error={form.formState.errors.serviceId?.message}
                        />
                    </motion.section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                        {/* Left Side: Staff and Date */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="space-y-6"
                        >
                            <section className="glass-card rounded-3xl p-6 lg:p-10 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">
                                        2
                                    </div>
                                    <h2 className="text-2xl lg:text-3xl font-black text-foreground">スタッフ・日時を選択</h2>
                                </div>
                                <StaffSelection form={form} storeId={storeSlug} initialStaff={staffList} />
                                <div className="h-px bg-border w-full" />
                                <DateSelection form={form} storeSlug={storeSlug} cart={cart} />
                            </section>
                        </motion.div>

                        {/* Right Side: Customer Info & Submit */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="space-y-6 lg:sticky lg:top-8"
                        >
                            <section className="glass-card rounded-3xl p-6 lg:p-10 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">
                                        3
                                    </div>
                                    <h2 className="text-2xl lg:text-3xl font-black text-foreground">お客様情報の入力</h2>
                                </div>
                                <CustomerInfo form={form} />
                            </section>

                            {/* Final Confirmation Card with Glassmorphism */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.5 }}
                                className="glass-card rounded-3xl p-8 lg:p-10 flex flex-col items-center space-y-6 overflow-hidden relative group"
                            >
                                <div className="w-full space-y-3 text-center relative z-10">
                                    <p className="text-base text-foreground font-medium">
                                        ご入力内容にお間違いはありませんか？
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary backdrop-blur-sm border border-border">
                                        <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                                            Final Confirmation
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full font-black text-xl h-16 pill-button bg-primary text-primary-foreground relative z-10 hover:scale-105 active:scale-100 transition-all duration-300"
                                    aria-label="予約を確定する"
                                >
                                    <span className="drop-shadow-lg">予約を確定する</span>
                                </Button>

                                <p className="text-sm text-muted-foreground text-center leading-relaxed relative z-10 max-w-md">
                                    「予約を確定する」ボタンを押すと、正式に予約が送信されます。<br />
                                    <span className="text-foreground font-semibold">オンライン決済</span>を選ぶと15分間枠を仮押さえします（期限切れで自動キャンセル）。
                                </p>

                                <div className="w-full glass-card rounded-2xl p-5 space-y-3 relative z-10 border border-border">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                                        <p className="font-bold text-foreground text-sm">キャンセルポリシー</p>
                                    </div>
                                    <ul className="space-y-2 text-sm text-foreground">
                                        <li className="flex justify-between items-center">
                                            <span>48時間前まで</span>
                                            <span className="font-bold text-foreground">無料</span>
                                        </li>
                                        <li className="flex justify-between items-center">
                                            <span>24〜48時間前</span>
                                            <span className="font-bold text-foreground">30%</span>
                                        </li>
                                        <li className="flex justify-between items-center">
                                            <span>24時間以内</span>
                                            <span className="font-bold text-foreground">50%</span>
                                        </li>
                                        <li className="flex justify-between items-center">
                                            <span>当日</span>
                                            <span className="font-bold text-destructive">100%</span>
                                        </li>
                                    </ul>
                                    <p className="text-xs text-muted-foreground pt-2 border-t border-border">店舗ごとのポリシーが設定されている場合はそちらを優先します。</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
