export type Option = {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
};

export type Service = {
    id: string;
    title: string;
    description: string | null;
    price: number;
    duration_minutes: number;
    image_url: string | null;
    options?: Option[]; // Injected for UI
};

export type CartItem = {
    serviceId: string;
    quantity: number;
    selectedOptions: string[]; // Option IDs
};
