import { z } from "zod";

export const bookingSchema = z.object({
    serviceId: z.string().optional(), // Legacy, but kept for compatibility. We trust cartItems more.
    staffId: z.string().optional(), // New: Staff nomination
    date: z.date({
        required_error: "日付を選択してください",
    }),
    timeSlot: z.string({
        required_error: "開始時間を選択してください",
    }),
    lastName: z.string().min(1, "姓を入力してください"),
    firstName: z.string().min(1, "名を入力してください"),
    email: z.string().email("メールアドレスの形式が正しくありません").optional().or(z.literal("")),
    phone: z.string().min(10, "電話番号を入力してください"),
    address: z.string().min(1, "住所を入力してください"), // New: Address required
    notes: z.string().optional(),
    paymentMethod: z.enum(['on_site', 'online_card']),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
