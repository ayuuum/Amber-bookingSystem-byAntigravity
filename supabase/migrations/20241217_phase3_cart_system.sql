-- Phase 3: Cart-Based Booking System (Upsell Architecture)

-- 1. Modify Services (UI Enhancements)
alter table public.services 
add column image_url text, -- URL to service image
add column description text; -- Ensure description exists if not already

-- 2. Create Service Options (Toppings)
create table public.service_options (
  id uuid default uuid_generate_v4() primary key,
  service_id uuid references public.services(id) on delete cascade not null,
  name text not null, -- e.g. "Anti-mold coating"
  price integer not null default 0,
  duration_minutes integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Modify Bookings (Parent Header)
-- Make service_id nullable because a booking now consists of multiple items.
alter table public.bookings 
alter column service_id drop not null;

-- Add Total Amount column for cache/snapshot
alter table public.bookings
add column total_amount integer default 0;

-- 4. Create Booking Items (Cart Line Items)
create table public.booking_items (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete restrict not null,
  quantity integer not null default 1,
  unit_price integer not null, -- Snapshot of price at booking time
  subtotal integer not null,   -- quantity * unit_price
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create Booking Item Options (Selected Toppings per Line Item)
create table public.booking_item_options (
  id uuid default uuid_generate_v4() primary key,
  booking_item_id uuid references public.booking_items(id) on delete cascade not null,
  service_option_id uuid references public.service_options(id) on delete restrict not null,
  price integer not null, -- Snapshot price
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. RLS Policies
alter table public.service_options enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_item_options enable row level security;

create policy "Options viewable by public" on public.service_options for select using (true);

-- Items visible to store/customer participants (similar to bookings)
create policy "Items viewable by logic" on public.booking_items for all using (true); 
create policy "Item Options viewable by logic" on public.booking_item_options for all using (true);
