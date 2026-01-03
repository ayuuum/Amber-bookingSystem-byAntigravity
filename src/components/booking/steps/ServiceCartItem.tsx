import { Service, CartItem } from "@/types/cart";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";

interface ServiceCartItemProps {
    service: Service;
    cartItem?: CartItem;
    onUpdate: (item: CartItem) => void;
}

export function ServiceCartItem({ service, cartItem, onUpdate }: ServiceCartItemProps) {
    const quantity = cartItem?.quantity || 0;
    const selectedOptions = cartItem?.selectedOptions || [];

    const handleQuantityChange = (delta: number) => {
        const newQty = Math.max(0, quantity + delta);
        onUpdate({
            serviceId: service.id,
            quantity: newQty,
            selectedOptions: newQty === 0 ? [] : selectedOptions // Reset options if 0
        });
    };

    const toggleOption = (optionId: string) => {
        if (quantity === 0) return; // Cannot add option to 0 qty

        const newOptions = selectedOptions.includes(optionId)
            ? selectedOptions.filter(id => id !== optionId)
            : [...selectedOptions, optionId];

        onUpdate({
            serviceId: service.id,
            quantity,
            selectedOptions: newOptions
        });
    };

    const isSelected = quantity > 0;

    return (
        <Card className={`overflow-hidden transition-all duration-200 border-2 ${isSelected ? 'border-blue-500 bg-blue-50/10 shadow-md' : 'border-transparent hover:border-gray-200'}`}>
            <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                    {/* Image Area */}
                    <div className="w-full sm:w-32 h-32 bg-gray-200 flex-shrink-0 relative">
                        {/* Placeholder or Image */}
                        {service.image_url ? (
                            <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                        )}
                        {isSelected && (
                            <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                選択中
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-lg">{service.title}</h3>
                                <div className="text-right">
                                    <span className="font-bold text-lg">¥{service.price.toLocaleString()}</span>
                                    <span className="text-xs text-gray-500 block">{service.duration_minutes}分</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{service.description}</p>
                        </div>

                        {/* Quantity Control */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center border rounded-md bg-white">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-r-none"
                                    onClick={() => handleQuantityChange(-1)}
                                    disabled={quantity === 0}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-bold">{quantity}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-l-none"
                                    onClick={() => handleQuantityChange(1)}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {isSelected && <span className="text-sm font-medium text-blue-600">台数・個数を選択</span>}
                        </div>
                    </div>
                </div>

                {/* Options Section (Shown only when selected) */}
                {isSelected && service.options && service.options.length > 0 && (
                    <div className="border-t bg-white/50 p-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <p className="text-sm font-bold mb-2 text-gray-700">オプション (オプションを追加して単価UP)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {service.options.map(opt => (
                                <div key={opt.id} className="flex items-center space-x-2 border rounded p-2 hover:bg-white transition-colors">
                                    <Checkbox
                                        id={`${service.id}-${opt.id}`}
                                        checked={selectedOptions.includes(opt.id)}
                                        onCheckedChange={() => toggleOption(opt.id)}
                                    />
                                    <Label htmlFor={`${service.id}-${opt.id}`} className="flex-1 cursor-pointer flex justify-between text-sm">
                                        <span>{opt.name}</span>
                                        <span className="text-gray-500">+¥{opt.price.toLocaleString()}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
