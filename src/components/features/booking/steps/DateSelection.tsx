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
    const [suggestions, setSuggestions] = useState<Array<{ date: string; slots: string[] }>>([]);
    const [suggestLoading, setSuggestLoading] = useState(false);

    useEffect(() => {
        if (!date || cart.length === 0) return;

        const fetchAvailability = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/availability-v2', {
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
                    setSuggestions([]);
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

    useEffect(() => {
        const suggest = async () => {
            if (!date || cart.length === 0 || loading) return;
            if (availableSlots.length > 0) return;
            setSuggestLoading(true);
            try {
                const nextDays = [1, 2, 3];
                const results: Array<{ date: string; slots: string[] }> = [];
                for (const offset of nextDays) {
                    const d = new Date(date);
                    d.setDate(d.getDate() + offset);
                    const res = await fetch('/api/availability-v2', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            date: format(d, 'yyyy-MM-dd'),
                            cartItems: cart,
                            storeSlug,
                        }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.length > 0) {
                            results.push({ date: format(d, 'yyyy-MM-dd'), slots: data.slice(0, 6) });
                        }
                    }
                }
                setSuggestions(results);
            } catch (e) {
                console.error('Suggestion fetch error:', e);
            } finally {
                setSuggestLoading(false);
            }
        };
        suggest();
    }, [availableSlots, cart, date, loading, storeSlug]);

    return (
        <div className="flex flex-col xl:flex-row gap-12">
            <div className="space-y-6 flex-1">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">日付を選択</h2>
                </div>
                <div className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm w-fit mx-auto xl:mx-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && form.setValue("date", d)}
                        disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                        }}
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
                        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                        <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">時間を選択</h2>
                    </div>
                    {loading && <span className="text-xs font-bold animate-pulse" style={{ color: 'var(--primary-color)' }}>Checking slots...</span>}
                </div>

                <div className="space-y-4">
                    {!date ? (
                        <div className="h-48 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50/50">
                            <p className="text-slate-400 font-medium italic">先に日付を選択してください</p>
                        </div>
                    ) : cart.length === 0 ? (
                        <div className="p-6 border-2 border-dashed border-amber-100 rounded-2xl bg-amber-50/60 text-center space-y-2">
                            <p className="text-amber-700 font-bold">先にサービスを選択してください</p>
                            <p className="text-xs text-amber-700/80">メニューをカートに追加すると選択可能な時間が表示されます。</p>
                        </div>
                    ) : loading ? (
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : availableSlots.length === 0 ? (
                        <div className="space-y-4">
                            <div className="p-8 border-2 border-dashed border-red-100 rounded-2xl bg-red-50/60 text-center space-y-2">
                                <p className="text-red-600 font-bold">申し訳ありません</p>
                                <p className="text-xs text-red-500">この日の予約枠はすべて埋まっています。<br />別の日にちをお選びください。</p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                                    代替日のおすすめ
                                    {suggestLoading && <span className="text-[11px] text-slate-400 animate-pulse">検索中…</span>}
                                </div>
                                {suggestions.length === 0 && !suggestLoading ? (
                                    <p className="text-xs text-slate-500">近い日程で空き枠を探しましたが、空きが見つかりませんでした。</p>
                                ) : (
                                    <div className="space-y-3">
                                        {suggestions.map(s => (
                                            <div key={s.date} className="p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                                                <p className="text-sm font-semibold text-slate-700 mb-2">{s.date}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {s.slots.map(slot => (
                                                        <button
                                                            key={`${s.date}-${slot}`}
                                                            type="button"
                                                            onClick={() => {
                                                                form.setValue("date", new Date(s.date));
                                                                form.setValue("timeSlot", slot);
                                                            }}
                                                            className="px-3 py-2 rounded-full text-sm font-semibold border border-slate-200 bg-slate-50 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] transition"
                                                        >
                                                            {slot}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {availableSlots.map(slot => (
                                <button
                                    key={slot}
                                    type="button"
                                    onClick={() => form.setValue("timeSlot", slot)}
                                    className={`py-3 px-4 rounded-full text-sm font-bold transition-all border ${form.watch("timeSlot") === slot
                                        ? 'text-white shadow-lg'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]'}`}
                                    style={form.watch("timeSlot") === slot ? { backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' } : {}}
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
