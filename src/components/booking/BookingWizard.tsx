"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingSchema, BookingFormData } from "./schema";
import { ServiceCart } from "./steps/ServiceCart";
import { DateSelection } from "./steps/DateSelection";
import { CustomerInfo } from "./steps/CustomerInfo";
import { BookingProgress } from "./BookingProgress";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { CartItem } from "@/types/cart";

interface BookingWizardProps {
    slug: string;
}

export function BookingWizard({ slug }: BookingWizardProps) {
    const [cart, setCart] = useState<CartItem[]>([]);

    const form = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            serviceId: "", // Logic handled in ServiceCart to sync this
            notes: "",
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
                date: data.date.toISOString().split('T')[0],
                cartItems: cart,
                slug: slug // Pass slug to resolve store
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

            alert("予約が完了しました！");
            window.location.href = '/';
        } catch (error) {
            console.error("Booking Error:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            alert(`予約に失敗しました: ${message}`);
        }
    };

    // Calculate current step based on form state
    const currentStep = cart.length > 0
        ? (form.watch("date") ? (form.watch("lastName") ? 2 : 1) : 0)
        : 0;

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-center">サービス予約</h1>

            {/* Progress Bar */}
            <BookingProgress currentStep={currentStep} />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    {/* Section 1: Service Cart */}
                    <ServiceCart
                        slug={slug}
                        cart={cart}
                        onUpdateCart={setCart}
                        error={form.formState.errors.serviceId?.message}
                    />

                    {/* Section 2: Date */}
                    {/* Note: DateSelection needs update to calculate duration from CART, not serviceId */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <DateSelection form={form} />
                    </div>

                    {/* Section 3: Customer Info */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <CustomerInfo form={form} />
                    </div>

                    {/* Submit Area */}
                    <div className="bg-gradient-to-br from-amber-50 to-white p-8 rounded-xl border border-amber-100 shadow-sm">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span className="text-sm text-gray-600">入力内容は暗号化されて送信されます</span>
                            </div>
                            <Button type="submit" size="lg" className="w-full max-w-md font-bold text-lg h-14 shadow-md hover:shadow-lg transition-shadow">
                                予約を確定する
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                確定後、LINEまたはメールで予約確認のご連絡をいたします
                            </p>
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
}
