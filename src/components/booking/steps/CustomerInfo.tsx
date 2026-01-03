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
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="lastName">姓 <span className="text-red-500">*</span></Label>
                        <Input
                            id="lastName"
                            placeholder="山田"
                            {...register("lastName", { required: "姓は必須です" })}
                        />
                        {errors.lastName && <p className="text-destructive text-sm">{errors.lastName.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="firstName">名 <span className="text-red-500">*</span></Label>
                        <Input
                            id="firstName"
                            placeholder="太郎"
                            {...register("firstName", { required: "名は必須です" })}
                        />
                        {errors.firstName && <p className="text-destructive text-sm">{errors.firstName.message}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">電話番号 <span className="text-red-500">*</span></Label>
                    <Input
                        id="phone"
                        type="tel"
                        placeholder="09012345678"
                        {...register("phone", {
                            required: "電話番号は必須です",
                            pattern: {
                                value: /^0[0-9]{9,10}$/,
                                message: "正しい電話番号を入力してください（ハイフンなし）"
                            }
                        })}
                    />
                    {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス (任意)</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="taro@example.com"
                        {...register("email")}
                    />
                    {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">訪問先住所 <span className="text-red-500">*</span></Label>
                    <Input
                        id="address"
                        placeholder="東京都渋谷区..."
                        {...register("address", { required: "住所は必須です" })}
                    />
                    {errors.address && <p className="text-destructive text-sm">{errors.address.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="customerNotes">備考</Label>
                <Textarea id="customerNotes" placeholder="駐車場はありますか..." {...register("notes")} />
            </div>
        </div>
    );
}
