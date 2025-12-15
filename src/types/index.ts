export type Role = 'admin' | 'staff' | 'customer';

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  settings: Record<string, any>;
  created_at: string;
}

export interface Service {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  store_id: string;
  customer_id: string | null; // Nullable for guest bookings if we allow that, or if profile deleted
  service_id: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
}
