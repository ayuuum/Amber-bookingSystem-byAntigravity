"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingSchema, BookingFormData } from "./schema";
import { ServiceCart } from "./steps/ServiceCart";
import { DateSelection } from "./steps/DateSelection";
import { CustomerInfo } from "./steps/CustomerInfo";
import { StaffSelection } from "./steps/StaffSelection";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { CartItem } from "@/types/cart";
import { Card, CardContent } from "@/components/ui/card";

interface BookingFormProps {
    orgSlug: string;
    storeSlug: string;
}

export function BookingForm({ orgSlug, storeSlug }: BookingFormProps) {
    const [cart, setCart] = useState<CartItem[]>([]);

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
                alert("サービスを選択してください");
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

            alert("予約が完了しました！ LINEで通知が届きます。");
            window.location.href = '/success';
        } catch (error) {
            console.error("Booking Error:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            alert(`予約に失敗しました: ${message}`);
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-12 bg-white min-h-screen">
            <header className="text-center space-y-4">
                <div className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
                    Booking System Phase 1.1
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                    サービス予約
                </h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                    ご希望のメニューと日時を選択してください。最短1分で予約が完了します。
                </p>
            </header>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-16">

                    {/* Menu Selection Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4">
                            <h2 className="text-2xl font-bold text-slate-900">1. メニューを選択</h2>
                            <span className="text-sm text-slate-400 font-normal">複数選択・オプション追加が可能です</span>
                        </div>
                        <ServiceCart
                            slug={storeSlug}
                            cart={cart}
                            onUpdateCart={setCart}
                            error={form.formState.errors.serviceId?.message}
                        />
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        {/* Left Side: Staff and Date */}
                        <div className="space-y-12">
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4">
                                    <h2 className="text-2xl font-bold text-slate-900">2. スタッフ・日時を選択</h2>
                                </div>

                                <Card className="border border-slate-100 shadow-sm rounded-xl bg-slate-50/30 overflow-hidden">
                                    <CardContent className="p-8 space-y-10">
                                        <StaffSelection form={form} storeId={storeSlug} />
                                        <div className="h-px bg-slate-100 w-full" />
                                        <DateSelection form={form} storeSlug={storeSlug} cart={cart} />
                                    </CardContent>
                                </Card>
                            </section>
                        </div>

                        {/* Right Side: Customer Info & Submit */}
                        <div className="space-y-12 lg:sticky lg:top-8">
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4">
                                    <h2 className="text-2xl font-bold text-slate-900">3. お客様情報の入力</h2>
                                </div>
                                <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden">
                                    <CardContent className="p-8">
                                        <CustomerInfo form={form} />
                                    </CardContent>
                                </Card>
                            </section>

                            <div className="bg-slate-900 p-8 rounded-2xl shadow-xl flex flex-col items-center space-y-6 text-white overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                                <div className="w-full space-y-2 text-center relative z-10">
                                    <p className="text-sm text-slate-400 font-medium">
                                        ご入力内容にお間違いはありませんか？
                                    </p>
                                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em]">
                                        Final Confirmation
                                    </p>
                                </div>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full font-bold text-xl h-16 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:translate-y-[-2px] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] active:translate-y-[1px] bg-amber-500 hover:bg-amber-600 border-none text-white relative z-10"
                                >
                                    予約を確定する
                                </Button>

                                <p className="text-xs text-slate-400 text-center leading-relaxed relative z-10">
                                    「予約を確定する」ボタンを押すと、<br />
                                    正式に予約が送信され、追ってLINE等でご連絡いたします。
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
