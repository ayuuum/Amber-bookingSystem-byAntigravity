import { UseFormReturn } from "react-hook-form";
import { BookingFormData } from "../schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Banknote, User, Phone, Mail, Home, MessageSquare } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface CustomerInfoProps {
    form: UseFormReturn<BookingFormData>;
}

export function CustomerInfo({ form }: CustomerInfoProps) {
    const { control, register, formState: { errors } } = form;

    return (
        <div className="space-y-10">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="customerName" className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <User className="w-3.5 h-3.5" /> お名前 <span className="text-amber-500 font-black">*</span>
                        </Label>
                        <Input
                            id="customerName"
                            placeholder="山田 太郎"
                            className="h-12 rounded-xl border-slate-200 focus:ring-amber-500 font-bold"
                            {...register("customerName")}
                        />
                        {errors.customerName && <p className="text-destructive text-xs font-bold">{errors.customerName.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="customerPhone" className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" /> 電話番号 <span className="text-amber-500 font-black">*</span>
                        </Label>
                        <Input
                            id="customerPhone"
                            type="tel"
                            placeholder="090-1234-5678"
                            className="h-12 rounded-xl border-slate-200 focus:ring-amber-500 font-bold"
                            {...register("customerPhone")}
                        />
                        {errors.customerPhone && <p className="text-destructive text-xs font-bold">{errors.customerPhone.message}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customerEmail" className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> メールアドレス (任意)
                    </Label>
                    <Input
                        id="customerEmail"
                        type="email"
                        placeholder="taro@example.com"
                        className="h-12 rounded-xl border-slate-200 focus:ring-amber-500 font-bold"
                        {...register("customerEmail")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customerAddress" className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Home className="w-3.5 h-3.5" /> 訪問先住所 <span className="text-amber-500 font-black">*</span>
                    </Label>
                    <Input
                        id="customerAddress"
                        placeholder="東京都渋谷区..."
                        className="h-12 rounded-xl border-slate-200 focus:ring-amber-500 font-bold"
                        {...register("customerAddress")}
                    />
                    {errors.customerAddress && <p className="text-destructive text-xs font-bold">{errors.customerAddress.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customerNotes" className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" /> 備考・ご要望
                    </Label>
                    <Textarea
                        id="customerNotes"
                        placeholder="駐車場や鍵の受け渡し方法など..."
                        className="rounded-xl border-slate-200 focus:ring-amber-500 font-bold min-h-[100px]"
                        {...register("notes")}
                    />
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
                <Label className="text-sm font-black text-slate-900">お支払い方法</Label>
                <FormField
                    control={control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <FormItem>
                                        <FormControl>
                                            <RadioGroupItem value="on_site" className="peer sr-only" id="pay_on_site" />
                                        </FormControl>
                                        <Label
                                            htmlFor="pay_on_site"
                                            className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-amber-200 peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50/50 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-peer-data-[state=checked]:bg-amber-100 group-peer-data-[state=checked]:text-amber-600">
                                                    <Banknote className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 leading-none">現地決済</div>
                                                    <div className="text-[10px] font-medium text-slate-400 mt-1">現金・PayPay等</div>
                                                </div>
                                            </div>
                                            <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center peer-data-[state=checked]:border-amber-500">
                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 opacity-0 peer-data-[state=checked]:opacity-100" />
                                            </div>
                                        </Label>
                                    </FormItem>

                                    <FormItem>
                                        <FormControl>
                                            <RadioGroupItem value="online_card" className="peer sr-only" id="pay_online" />
                                        </FormControl>
                                        <Label
                                            htmlFor="pay_online"
                                            className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-amber-200 peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50/50 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-peer-data-[state=checked]:bg-amber-100 group-peer-data-[state=checked]:text-amber-600">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 leading-none">オンライン決済</div>
                                                    <div className="text-[10px] font-medium text-slate-400 mt-1">クレジットカード (Stripe)</div>
                                                </div>
                                            </div>
                                            <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center peer-data-[state=checked]:border-amber-500">
                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 opacity-0 peer-data-[state=checked]:opacity-100" />
                                            </div>
                                        </Label>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
