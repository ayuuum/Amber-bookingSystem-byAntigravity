import { UseFormReturn } from "react-hook-form";
import { BookingFormData } from "../schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CustomerInfoProps {
    form: UseFormReturn<BookingFormData>;
}

export function CustomerInfo({ form }: CustomerInfoProps) {
    const { register, formState: { errors } } = form;
    // Phase 0: Guest Booking Only (No Login required)

    return (
        <div className="space-y-4 max-w-lg mx-auto md:mx-0">
            <h2 className="text-xl font-semibold">お客様情報</h2>
            <div className="bg-muted p-4 rounded-md mb-6 text-sm">
                連絡先と訪問先住所を入力してください。
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="customerName">お名前 <span className="text-red-500">*</span></Label>
                    <Input
                        id="customerName"
                        placeholder="山田 太郎"
                        {...register("customerName", { required: "お名前は必須です" })}
                    />
                    {errors.customerName && <p className="text-destructive text-sm">{errors.customerName.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customerPhone">電話番号 <span className="text-red-500">*</span></Label>
                    <Input
                        id="customerPhone"
                        type="tel"
                        placeholder="090-1234-5678"
                        {...register("customerPhone", { required: "電話番号は必須です" })}
                    />
                    {errors.customerPhone && <p className="text-destructive text-sm">{errors.customerPhone.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customerEmail">メールアドレス (任意)</Label>
                    <Input
                        id="customerEmail"
                        type="email"
                        placeholder="taro@example.com"
                        {...register("customerEmail")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customerAddress">訪問先住所 <span className="text-red-500">*</span></Label>
                    <Input
                        id="customerAddress"
                        placeholder="東京都渋谷区..."
                        {...register("customerAddress", { required: "住所は必須です" })}
                    />
                    {errors.customerAddress && <p className="text-destructive text-sm">{errors.customerAddress.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="customerNotes">備考</Label>
                <Textarea id="customerNotes" placeholder="駐車場はありますか..." {...register("notes")} />
            </div>
        </div>
    );
}
