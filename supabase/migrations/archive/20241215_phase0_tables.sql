-- Phase 0 Migration: Staff, Customers, and Bookings Update

-- 1. Create STAFF table
create table public.staff (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  google_calendar_id text, -- For Google Calendar Sync
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create CUSTOMERS table (Separate from auth.users)
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  line_user_id text, -- Nullable, used if booking via LINE
  name text not null,
  phone text not null, -- Primary identifier for guest bookings
  address text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Modify BOOKINGS table
-- Add staff_id
alter table public.bookings 
add column staff_id uuid references public.staff(id) on delete set null;

-- Add google_event_id for sync
alter table public.bookings 
add column google_event_id text;

-- Remove dependency on auth.users for customer_id (Change FK)
alter table public.bookings 
drop constraint bookings_customer_id_fkey;

alter table public.bookings 
add constraint bookings_customer_id_fkey 
foreign key (customer_id) references public.customers(id) on delete restrict;

-- 4. Enable RLS
alter table public.staff enable row level security;
alter table public.customers enable row level security;

-- Policies (Simplified for MVP)
create policy "Staff viewable by everyone" on public.staff for select using (true);
create policy "Customers viewable by logic" on public.customers for all using (true); -- Ideally restrict to admin/system
