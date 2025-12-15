import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { BookingFormData } from "../schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ServiceSelectionProps {
    form: UseFormReturn<BookingFormData>;
}

// Define local type matching API response
type Service = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration_minutes: number;
};

export function ServiceSelection({ form }: ServiceSelectionProps) {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch('/api/services');
                if (res.ok) {
                    const data = await res.json();
                    setServices(data);
                }
            } catch (error) {
                console.error("Failed to fetch services", error);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    if (loading) return <div className="p-4 text-center">メニューを読み込み中...</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">サービスを選択</h2>
            <RadioGroup
                onValueChange={(value) => form.setValue("serviceId", value)}
                defaultValue={form.watch("serviceId")}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
                {services.map((service) => (
                    <Label
                        key={service.id}
                        htmlFor={service.id}
                        className={cn(
                            "flex flex-col space-y-2 border rounded-lg p-4 cursor-pointer hover:bg-slate-50 transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-slate-50",
                            form.watch("serviceId") === service.id && "border-primary bg-slate-50"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">{service.name}</span>
                            <RadioGroupItem value={service.id} id={service.id} />
                        </div>
                        <p className="text-sm text-gray-500">{service.description}</p>
                        <p className="font-medium">¥{service.price.toLocaleString()}</p>
                    </Label>
                ))}
            </RadioGroup>
            {form.formState.errors.serviceId && (
                <p className="text-sm text-destructive">{form.formState.errors.serviceId.message}</p>
            )}
        </div>
    );
}
