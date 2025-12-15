import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { BookingFormData } from "../schema";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface DateSelectionProps {
    form: UseFormReturn<BookingFormData>;
}

export function DateSelection({ form }: DateSelectionProps) {
    const date = form.watch("date");
    const serviceId = form.watch("serviceId");
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!date || !serviceId) return;

        const fetchAvailability = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        date: format(date, 'yyyy-MM-dd'),
                        serviceId
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setAvailableSlots(data);
                } else {
                    console.error("Failed to fetch availability");
                    setAvailableSlots([]); // Fallback
                }
            } catch (error) {
                console.error("Availability Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAvailability();
    }, [date, serviceId]);

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <div className="space-y-4 flex-1">
                <h2 className="text-xl font-semibold">日付を選択</h2>
                <div className="border rounded-md p-4 w-fit mx-auto md:mx-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && form.setValue("date", d)}
                        disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-md"
                    />
                </div>
                {form.formState.errors.date && (
                    <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
                )}
            </div>

            <div className="space-y-4 flex-1">
                <h2 className="text-xl font-semibold">開始時間を選択</h2>
                <div className="space-y-2">
                    <Label>時間枠 {loading && <span className="text-xs text-muted-foreground ml-2">(空き状況を確認中...)</span>}</Label>
                    <Select
                        onValueChange={(value) => form.setValue("timeSlot", value)}
                        defaultValue={form.watch("timeSlot")}
                        disabled={loading || availableSlots.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={
                                !date ? "日付を選択してください" :
                                    loading ? "確認中..." :
                                        availableSlots.length === 0 ? "空き枠がありません" :
                                            "時間を選択"
                            } />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSlots.map(slot => (
                                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {availableSlots.length === 0 && date && !loading && (
                        <p className="text-sm text-yellow-600">この日の予約枠はすべて埋まっています。<br />別の日付を選択してください。</p>
                    )}
                    {form.formState.errors.timeSlot && (
                        <p className="text-sm text-destructive">{form.formState.errors.timeSlot.message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
