import { z } from "zod";

export const bookingSchema = z.object({
    serviceId: z.string().min(1, "Please select a service"),
    date: z.date(),
    // For simplicity, we'll just have a time slot text for now.
    // In a real app, this would be validated against available slots.
    timeSlot: z.string().min(1, "Please select a time"),
    customerName: z.string().min(2, "Name must be at least 2 characters"),
    customerEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
    customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
    customerAddress: z.string().min(5, "Address must be at least 5 characters"),
    notes: z.string().optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
