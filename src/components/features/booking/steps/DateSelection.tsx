import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { BookingFormData } from "../schema";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { CartItem } from "@/types/cart"; // Make sure to import this type

interface DateSelectionProps {
    form: UseFormReturn<BookingFormData>;
    storeSlug: string;
    cart: CartItem[];
}

export function DateSelection({ form, storeSlug, cart }: DateSelectionProps) {
    const date = form.watch("date");
    const staffId = form.watch("staffId");

    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!date || cart.length === 0) return;

        const fetchAvailability = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        date: format(date, 'yyyy-MM-dd'),
                        cartItems: cart,
                        storeSlug,
                        staffId: staffId === "none" ? undefined : staffId
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setAvailableSlots(data);
                } else {
                    console.error("Failed to fetch availability");
                    setAvailableSlots([]);
                }
            } catch (error) {
                console.error("Availability Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailability();
    }, [date, cart, storeSlug, staffId]);

    return (
        <div className="flex flex-col xl:flex-row gap-12">
            <div className="space-y-6 flex-1">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-amber-500 rounded-full" />
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">日付を選択</h2>
                </div>
                <div className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm w-fit mx-auto xl:mx-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && form.setValue("date", d)}
                        disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-md"
                    />
                </div>
                {form.formState.errors.date && (
                    <p className="text-sm text-red-500 font-bold">{form.formState.errors.date.message}</p>
                )}
            </div>

            <div className="space-y-6 flex-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-amber-500 rounded-full" />
                        <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">時間を選択</h2>
                    </div>
                    {loading && <span className="text-xs text-amber-600 font-bold animate-pulse">Checking slots...</span>}
                </div>

                <div className="space-y-4">
                    {!date ? (
                        <div className="h-48 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50/50">
                            <p className="text-slate-400 font-medium italic">先に日付を選択してください</p>
                        </div>
                    ) : loading ? (
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : availableSlots.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-red-100 rounded-2xl bg-red-50/50 text-center space-y-2">
                            <p className="text-red-600 font-bold">申し訳ありません</p>
                            <p className="text-xs text-red-500">この日の予約枠はすべて埋まっています。<br />別の日にちをお選びください。</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {availableSlots.map(slot => (
                                <button
                                    key={slot}
                                    type="button"
                                    onClick={() => form.setValue("timeSlot", slot)}
                                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border-2 ${form.watch("timeSlot") === slot
                                        ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                                        : 'bg-white border-slate-100 text-slate-600 hover:border-amber-200 hover:bg-amber-50/50'}`}
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                    )}

                    {form.formState.errors.timeSlot && (
                        <p className="text-sm text-red-500 font-bold">{form.formState.errors.timeSlot.message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
