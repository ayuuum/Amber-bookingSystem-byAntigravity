"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingSchema, BookingFormData } from "./schema";
import { ServiceSelection } from "./steps/ServiceSelection";
import { DateSelection } from "./steps/DateSelection";
import { CustomerInfo } from "./steps/CustomerInfo";
import { Confirmation } from "./steps/Confirmation";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
// import { useToast } from "@/hooks/use-toast";

export function BookingWizard() {
    const [step, setStep] = useState(1);
    const form = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            serviceId: "",
            notes: "",
        },
        mode: "onChange",
    });

    // Mock toast or simple alert if missing
    const { } = form;

    const nextStep = async () => {
        let valid = false;
        if (step === 1) {
            valid = await form.trigger("serviceId");
        } else if (step === 2) {
            valid = await form.trigger(["date", "timeSlot"]);
        } else if (step === 3) {
            valid = await form.trigger(["customerName", "customerEmail", "customerPhone", "customerAddress"]);
        } else if (step === 4) {
            valid = true;
        }

        if (valid) {
            setStep((s) => s + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setStep((s) => s - 1);
        window.scrollTo(0, 0);
    };

    const onSubmit = async (data: BookingFormData) => {
        try {
            // Format date to YYYY-MM-DD to ensure consistent date handling across timezones
            // We create a new object to avoid mutating the original data if needed
            const payload = {
                ...data,
                date: data.date.toISOString().split('T')[0], // or use format(date, 'yyyy-MM-dd') if date-fns available
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
            // Redirect to home or success page
            window.location.href = '/';
        } catch (error) {
            console.error("Booking Error:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            alert(`予約に失敗しました: ${message}`);
        }
    };

    return (
        <div className="space-y-8">
            {/* Progress Indicator */}
            <div className="flex justify-between mb-8 max-w-sm mx-auto">
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step >= s
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input text-muted-foreground"
                            }`}
                    >
                        {s}
                    </div>
                ))}
            </div>

            <div className="min-h-[400px]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {step === 1 && <ServiceSelection form={form} />}
                        {step === 2 && <DateSelection form={form} />}
                        {step === 3 && <CustomerInfo form={form} />}
                        {step === 4 && <Confirmation form={form} />}

                        <div className="flex justify-between pt-8 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                disabled={step === 1}
                                className={step === 1 ? "invisible" : ""}
                            >
                                戻る
                            </Button>

                            {step < 4 ? (
                                <Button type="button" onClick={nextStep}>
                                    次へ
                                </Button>
                            ) : (
                                <Button type="submit">
                                    予約を確定する
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
