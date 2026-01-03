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
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" aria-hidden="true" /> 姓 <span className="text-destructive font-black">*</span>
                                </Label>
                                <Input
                                    id="lastName"
                                    placeholder="山田"
                                    className="h-12 glass-input rounded-xl font-bold focus:ring-4 focus:ring-ring transition-all text-foreground"
                                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                                    aria-invalid={!!errors.lastName}
                                    {...register("lastName")}
                                />
                                {errors.lastName && <p id="lastName-error" className="text-destructive text-xs font-bold" role="alert">{errors.lastName.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" aria-hidden="true" /> 名 <span className="text-destructive font-black">*</span>
                                </Label>
                                <Input
                                    id="firstName"
                                    placeholder="太郎"
                                    className="h-12 glass-input rounded-xl font-bold focus:ring-4 focus:ring-ring transition-all text-foreground"
                                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                                    aria-invalid={!!errors.firstName}
                                    {...register("firstName")}
                                />
                                {errors.firstName && <p id="firstName-error" className="text-destructive text-xs font-bold" role="alert">{errors.firstName.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" aria-hidden="true" /> 電話番号 <span className="text-destructive font-black">*</span>
                        </Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="090-1234-5678"
                            className="h-12 glass-input rounded-xl font-bold focus:ring-4 focus:ring-ring transition-all text-foreground"
                            aria-describedby={errors.phone ? "phone-error" : undefined}
                            aria-invalid={!!errors.phone}
                            {...register("phone")}
                        />
                        {errors.phone && <p id="phone-error" className="text-destructive text-xs font-bold" role="alert">{errors.phone.message}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" aria-hidden="true" /> メールアドレス (任意)
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="taro@example.com"
                        className="h-12 glass-input rounded-xl font-bold focus:ring-4 focus:ring-ring transition-all text-foreground"
                        aria-describedby={errors.email ? "email-error" : undefined}
                        aria-invalid={!!errors.email}
                        {...register("email")}
                    />
                    {errors.email && <p id="email-error" className="text-destructive text-xs font-bold" role="alert">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                        <Home className="w-3.5 h-3.5" aria-hidden="true" /> 訪問先住所 <span className="text-destructive font-black">*</span>
                    </Label>
                    <Input
                        id="address"
                        placeholder="東京都渋谷区..."
                        className="h-12 glass-input rounded-xl font-bold focus:ring-4 focus:ring-ring transition-all text-foreground"
                        aria-describedby={errors.address ? "address-error" : undefined}
                        aria-invalid={!!errors.address}
                        {...register("address")}
                    />
                    {errors.address && <p id="address-error" className="text-destructive text-xs font-bold" role="alert">{errors.address.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customerNotes" className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> 備考・ご要望
                    </Label>
                    <Textarea
                        id="customerNotes"
                        placeholder="駐車場や鍵の受け渡し方法など..."
                        className="glass-input rounded-xl font-bold min-h-[100px] focus:ring-4 focus:ring-ring transition-all text-foreground"
                        aria-describedby={errors.notes ? "notes-error" : undefined}
                        aria-invalid={!!errors.notes}
                        {...register("notes")}
                    />
                    {errors.notes && <p id="notes-error" className="text-destructive text-xs font-bold" role="alert">{errors.notes.message}</p>}
                </div>
            </div>

            <div className="pt-6 border-t border-border space-y-4">
                <Label className="text-sm font-black text-foreground">お支払い方法</Label>
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
                                            className={`flex items-center justify-between p-4 glass-card border-2 rounded-2xl cursor-pointer transition-all pill-button ${
                                                field.value === 'on_site' ? 'border-ring glow-effect' : 'border-border hover:border-ring/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 glass-card rounded-xl flex items-center justify-center transition-all ${
                                                    field.value === 'on_site' ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                    <Banknote className="w-5 h-5" aria-hidden="true" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground leading-none">現地決済</div>
                                                    <div className="text-[10px] font-medium text-muted-foreground mt-1">現金・PayPay等</div>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                field.value === 'on_site' ? 'border-ring' : 'border-border'
                                            }`}>
                                                <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                                                    field.value === 'on_site' ? 'bg-foreground' : 'bg-transparent'
                                                }`} />
                                            </div>
                                        </Label>
                                    </FormItem>

                                    <FormItem>
                                        <FormControl>
                                            <RadioGroupItem value="online_card" className="peer sr-only" id="pay_online" />
                                        </FormControl>
                                        <Label
                                            htmlFor="pay_online"
                                            className={`flex items-center justify-between p-4 glass-card border-2 rounded-2xl cursor-pointer transition-all pill-button ${
                                                field.value === 'online_card' ? 'border-ring glow-effect' : 'border-border hover:border-ring/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 glass-card rounded-xl flex items-center justify-center transition-all ${
                                                    field.value === 'online_card' ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                    <CreditCard className="w-5 h-5" aria-hidden="true" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground leading-none">オンライン決済</div>
                                                    <div className="text-[10px] font-medium text-muted-foreground mt-1">クレジットカード (Stripe)</div>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                field.value === 'online_card' ? 'border-ring' : 'border-border'
                                            }`}>
                                                <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                                                    field.value === 'online_card' ? 'bg-foreground' : 'bg-transparent'
                                                }`} />
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
