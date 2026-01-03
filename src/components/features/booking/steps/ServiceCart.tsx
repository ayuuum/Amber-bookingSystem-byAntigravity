import { useEffect, useState } from "react";
import { Service, CartItem } from "@/types/cart";
import { ServiceCartItem } from "./ServiceCartItem";
import { LoadingState } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";

interface ServiceCartProps {
    slug: string;
    cart: CartItem[];
    onUpdateCart: (cart: CartItem[]) => void;
    initialServices?: Service[];
    error?: string;
}

export function ServiceCart({ slug, cart, onUpdateCart, initialServices, error }: ServiceCartProps) {
    const [services, setServices] = useState<Service[]>(initialServices || []);
    const [loading, setLoading] = useState(!initialServices);

    useEffect(() => {
        if (initialServices) {
            setServices(initialServices);
            setLoading(false);
            return;
        }

        const fetchServices = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/services?slug=${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter only active services and format data
                    const formattedData = data
                        .filter((s: any) => s.is_active !== false) // Only show active services
                        .map((s: any) => ({
                            ...s,
                            options: s.options?.map((o: any) => ({
                                ...o,
                                durationMinutes: o.duration_minutes || 0
                            })) || []
                        }));
                    setServices(formattedData);
                } else {
                    console.error("Failed to fetch services:", res.status, res.statusText);
                    const errorData = await res.json().catch(() => ({}));
                    console.error("Error details:", errorData);
                }
            } catch (error) {
                console.error("Failed to fetch services", error);
            } finally {
                setLoading(false);
            }
        };
        if (slug) {
            fetchServices();
        } else {
            setLoading(false);
        }
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

    if (loading) {
        return <LoadingState message="メニューを読み込み中..." />;
    }

    if (services.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-foreground">メニュー選択</h2>
                </div>
                <EmptyState
                    title="予約可能なメニューがありません"
                    description="現在、予約可能なメニューがありません。管理者にお問い合わせください。"
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">メニュー選択</h2>
                {totalAmount > 0 && (
                    <div className="text-right">
                        <span className="text-sm text-muted-foreground mr-2">合計</span>
                        <span className="text-xl font-bold text-foreground">¥{totalAmount.toLocaleString()}</span>
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
