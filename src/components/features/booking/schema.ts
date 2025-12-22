import { z } from "zod";

export const bookingSchema = z.object({
    serviceId: z.string().optional(),
    staffId: z.string().optional(),
    date: z.date({
        required_error: "日付を選択してください",
    }),
    timeSlot: z.string({
        required_error: "開始時間を選択してください",
    }),
    customerName: z.string().min(2, "お名前は必須です"),
    customerEmail: z.string().email("メールアドレスの形式が正しくありません").optional().or(z.literal('')),
    customerPhone: z.string().min(10, "電話番号を入力してください"),
    customerAddress: z.string().min(5, "住所を入力してください"),
    notes: z.string().optional(),
    paymentMethod: z.enum(['on_site', 'online_card']),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
