"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { CartItem } from "@/types/cart";

interface ServiceSuggestion {
    id: string;
    title: string;
    price: number;
    description?: string;
    duration_minutes?: number;
    reason?: string;
}

interface ServiceSuggestionCardProps {
    service: ServiceSuggestion;
    suggestionType?: "upsell" | "cross_sell" | "combo";
    onAddToCart?: () => void;
}

export function ServiceSuggestionCard({ 
    service, 
    suggestionType = "cross_sell",
    onAddToCart 
}: ServiceSuggestionCardProps) {
    const { addToCart } = useCart();
    const { toast } = useToast();

    const handleAddToCart = () => {
        const cartItem: CartItem = {
            serviceId: service.id,
            quantity: 1,
            selectedOptions: []
        };

        addToCart(cartItem);
        
        toast({
            title: "カートに追加しました",
            description: `${service.title}をカートに追加しました。`,
            variant: "default",
        });

        if (onAddToCart) {
            onAddToCart();
        }
    };

    const getSuggestionLabel = () => {
        switch (suggestionType) {
            case "upsell":
                return "おすすめプラン";
            case "cross_sell":
                return "関連サービス";
            case "combo":
                return "セットプラン";
            default:
                return "おすすめ";
        }
    };

    return (
        <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                {getSuggestionLabel()}
                            </span>
                        </div>
                        <CardTitle className="text-lg font-bold">{service.title}</CardTitle>
                        {service.reason && (
                            <CardDescription className="text-xs mt-1">
                                {service.reason}
                            </CardDescription>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {service.description}
                    </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-foreground font-semibold">
                            <span>¥{service.price.toLocaleString()}</span>
                        </div>
                        {service.duration_minutes && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{service.duration_minutes}分</span>
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={handleAddToCart}
                        size="sm"
                        className="gap-2"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        カートに追加
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

interface ServiceSuggestionGroupProps {
    services: ServiceSuggestion[];
    suggestionType?: "upsell" | "cross_sell" | "combo";
    title?: string;
    onAddToCart?: () => void;
}

export function ServiceSuggestionGroup({
    services,
    suggestionType = "cross_sell",
    title,
    onAddToCart
}: ServiceSuggestionGroupProps) {
    if (services.length === 0) return null;

    return (
        <div className="space-y-3">
            {title && (
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            )}
            <div className="space-y-2">
                {services.map((service) => (
                    <ServiceSuggestionCard
                        key={service.id}
                        service={service}
                        suggestionType={suggestionType}
                        onAddToCart={onAddToCart}
                    />
                ))}
            </div>
        </div>
    );
}




