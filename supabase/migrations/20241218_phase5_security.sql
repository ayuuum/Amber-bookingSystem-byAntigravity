-- Phase 5: Security Hardening (RLS & Data Isolation)

-- 1. Ensure Profiles Table & Link to Store
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text check (role in ('admin', 'staff', 'customer')),
  store_id uuid references public.stores(id) on delete set null, -- Nullable for super-admins or initial setup
  full_name text,
  phone text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;
create policy "Users can see own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- 2. Helper Function to get current user's store_id
-- This function is SECURITY CRITICAL. It defines the tenant context.
create or replace function auth.get_my_store_id()
returns uuid
language sql
security definer -- Runs with privileges of creator (postgres), needed to read profiles/stores securely if RLS blocks
set search_path = public -- Secure search path
stable
as $$
  select store_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

-- 3. Replace RLS Policies with Strict Tenant Isolation

-- Helper to drop policy if exists (Supabase doesn't have create or replace policy)
do $$
begin
  -- Drop existing permissive policies if they exist (names from manual check or generic guess)
  -- We'll try to drop common names found in previous files or just ignore errors if not found?
  -- Better to specifically target the ones we know: "Staff viewable by everyone", "Customers viewable by logic", etc.
  
  -- bookings (No policy existed, but strictly enabling RLS now)
  -- services (No policy existed?)
  -- staff (Policy: "Staff viewable by everyone")
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'Staff viewable by everyone') then
    drop policy "Staff viewable by everyone" on public.staff;
  end if;

  -- customers (Policy: "Customers viewable by logic")
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'customers' and policyname = 'Customers viewable by logic') then
    drop policy "Customers viewable by logic" on public.customers;
  end if;
  
  -- service_options (Policy: "Options viewable by public")
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_options' and policyname = 'Options viewable by public') then
    drop policy "Options viewable by public" on public.service_options;
  end if;

end
$$;

-- ENABLE RLS on all tables that might not have it
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_item_options enable row level security;
alter table public.services enable row level security;

-- BOOKINGS
create policy "Tenants can view own bookings" on public.bookings
  for select
  using (store_id = auth.get_my_store_id());

create policy "Tenants can insert own bookings" on public.bookings
  for insert
  with check (store_id = auth.get_my_store_id());

create policy "Tenants can update own bookings" on public.bookings
  for update
  using (store_id = auth.get_my_store_id());

-- CUSTOMERS
create policy "Tenants can view own customers" on public.customers
  for all
  using (store_id = auth.get_my_store_id());

-- STAFF
create policy "Tenants can view own staff" on public.staff
  for all
  using (store_id = auth.get_my_store_id());

-- SERVICES (Assuming services are per-store)
create policy "Tenants can view own services" on public.services
  for all
  using (store_id = auth.get_my_store_id());

-- SERVICE OPTIONS (Linked via service_id -> services -> store_id)
create policy "Tenants can view own service options" on public.service_options
  for select
  using (
    exists (
      select 1 from public.services
      where services.id = service_options.service_id
      and services.store_id = auth.get_my_store_id()
    )
  );

-- BOOKING ITEMS (Linked via booking_id -> bookings -> store_id)
create policy "Tenants can view own booking items" on public.booking_items
  for all
  using (
    exists (
      select 1 from public.bookings
      where bookings.id = booking_items.booking_id
      and bookings.store_id = auth.get_my_store_id()
    )
  );
