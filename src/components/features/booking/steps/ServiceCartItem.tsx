import { Service, CartItem } from "@/types/cart";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
            selectedOptions: newQty === 0 ? [] : selectedOptions
        });
    };

    const toggleOption = (optionId: string) => {
        if (quantity === 0) return;

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
        <div
            className={`glass-card overflow-hidden transition-all duration-300 border-2 rounded-2xl ${
                isSelected ? 'border-ring' : 'border-border hover:border-ring/50'
            }`}
        >
            <div className="p-0">
                <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-36 h-36 bg-secondary flex-shrink-0 relative">
                        {service.image_url ? (
                            <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                        )}
                        {isSelected && (
                            <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
                                Selected
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-black text-xl text-foreground">{service.title}</h3>
                                <div className="text-right">
                                    <span className="font-black text-2xl text-foreground">¥{service.price.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground font-bold block">{service.duration_minutes}分</span>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">{service.description}</p>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center glass-card border border-border rounded-2xl overflow-hidden">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-none hover:bg-accent text-foreground"
                                    onClick={() => handleQuantityChange(-1)}
                                    disabled={quantity === 0}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-10 text-center font-black text-lg text-foreground">{quantity}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-none hover:bg-accent text-foreground"
                                    onClick={() => handleQuantityChange(1)}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {isSelected && (
                                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                                    Set Quantity
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {isSelected && service.options && service.options.length > 0 && (
                    <div className="border-t border-border p-6 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300 bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                            <p className="text-sm font-black text-foreground uppercase tracking-wider">Options</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {service.options.map(opt => (
                                <div
                                    key={opt.id}
                                    className={`flex items-center space-x-3 glass-card border-2 rounded-xl p-3 transition-all cursor-pointer pill-button ${
                                        selectedOptions.includes(opt.id) ? 'border-ring' : 'border-border hover:border-ring/50'
                                    }`}
                                    onClick={() => toggleOption(opt.id)}
                                >
                                    <Checkbox
                                        id={`${service.id}-${opt.id}`}
                                        checked={selectedOptions.includes(opt.id)}
                                        onCheckedChange={() => toggleOption(opt.id)}
                                        className="border-border rounded"
                                        style={selectedOptions.includes(opt.id) ? { backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' } : {}}
                                    />
                                    <Label htmlFor={`${service.id}-${opt.id}`} className="flex-1 cursor-pointer flex justify-between text-sm font-bold text-foreground">
                                        <span>{opt.name}</span>
                                        <span className="text-foreground">+¥{opt.price.toLocaleString()}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
