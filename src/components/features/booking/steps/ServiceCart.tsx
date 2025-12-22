import { useEffect, useState } from "react";
import { Service, CartItem } from "@/types/cart";
import { ServiceCartItem } from "./ServiceCartItem";
import { Loader2 } from "lucide-react";

interface ServiceCartProps {
    slug: string;
    cart: CartItem[];
    onUpdateCart: (cart: CartItem[]) => void;
    error?: string;
}

export function ServiceCart({ slug, cart, onUpdateCart, error }: ServiceCartProps) {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                // Assuming slug can resolve services. If we have storeId, utilize that.
                // The API needs to handle storeSlug or storeId.
                const res = await fetch(`/api/services?slug=${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    const formattedData = data.map((s: any) => ({
                        ...s,
                        options: s.options?.map((o: any) => ({
                            ...o,
                            durationMinutes: o.duration_minutes || 0
                        })) || []
                    }));
                    setServices(formattedData);
                }
            } catch (error) {
                console.error("Failed to fetch services", error);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, [slug]);

    const handleUpdateCart = (updatedItem: CartItem) => {
        if (updatedItem.quantity === 0) {
            onUpdateCart(cart.filter(item => item.serviceId !== updatedItem.serviceId));
            return;
        }

        const existingIndex = cart.findIndex(item => item.serviceId === updatedItem.serviceId);
        if (existingIndex > -1) {
            const newCart = [...cart];
            newCart[existingIndex] = updatedItem;
            onUpdateCart(newCart);
        } else {
            onUpdateCart([...cart, updatedItem]);
        }
    };

    const totalAmount = cart.reduce((sum, item) => {
        const service = services.find(s => s.id === item.serviceId);
        if (!service) return sum;

        let itemPrice = service.price;
        const optionsCost = item.selectedOptions.reduce((optSum, optId) => {
            const opt = service.options?.find(o => o.id === optId);
            return optSum + (opt?.price || 0);
        }, 0);

        return sum + (item.quantity * (itemPrice + optionsCost));
    }, 0);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">メニュー選択</h2>
                {totalAmount > 0 && (
                    <div className="text-right">
                        <span className="text-sm text-gray-500 mr-2">合計</span>
                        <span className="text-xl font-bold text-red-600">¥{totalAmount.toLocaleString()}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {services.map(service => (
                    <ServiceCartItem
                        key={service.id}
                        service={service}
                        cartItem={cart.find(c => c.serviceId === service.id)}
                        onUpdate={handleUpdateCart}
                    />
                ))}
            </div>

            {error && (
                <p className="text-center text-sm text-destructive font-bold bg-red-50 p-2 rounded">
                    {error}
                </p>
            )}
        </div>
    );
}
