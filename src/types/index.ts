export type Role = 'hq_admin' | 'store_admin' | 'field_staff' | 'customer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  store_id: string | null;
  role: Role;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  organization_id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_archived: boolean;
  settings: Record<string, unknown>;
  line_channel_access_token: string | null;
  line_channel_secret: string | null;
  google_refresh_token: string | null;
  google_access_token: string | null;
  google_token_expiry: number | null;
  created_at: string;
}

export interface Staff {
  id: string;
  organization_id: string;
  store_id: string;
  name: string;
  nomination_fee: number | null;
  is_active: boolean | null;
  google_calendar_id: string | null;
  google_refresh_token: string | null;
  profile_id: string | null;
  created_at: string;
}

export interface StaffStore {
  id: string;
  staff_id: string;
  store_id: string;
  created_at: string;
}

export interface Shift {
  id: string;
  organization_id: string;
  store_id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  is_published: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  category: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  store_id: string;
  line_user_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface HouseAsset {
  id: string;
  customer_id: string;
  asset_type: string;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  installed_at: string | null;
  location_in_house: string | null;
  notes: string | null;
  image_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'working' | 'completed' | 'cancelled';
export type BookingChannel = 'web' | 'line' | 'phone' | 'walk_in';

export interface Booking {
  id: string;
  organization_id: string;
  store_id: string;
  customer_id: string | null;
  service_id: string;
  staff_id: string | null;

  start_time: string;
  end_time: string;

  status: BookingStatus;
  channel: BookingChannel;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;

  notes: string | null;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void' | 'overdue';

export interface Invoice {
  id: string;
  booking_id: string;
  organization_id: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  stripe_invoice_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
