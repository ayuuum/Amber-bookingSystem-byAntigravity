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
-- We create this in PUBLIC schema to avoid permission issues with AUTH schema.
create or replace function public.get_my_store_id()
returns uuid
language sql
security definer -- Runs with privileges of creator (postgres)
set search_path = public
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
  using (store_id = public.get_my_store_id());

create policy "Tenants can insert own bookings" on public.bookings
  for insert
  with check (store_id = public.get_my_store_id());

create policy "Tenants can update own bookings" on public.bookings
  for update
  using (store_id = public.get_my_store_id());

-- CUSTOMERS
create policy "Tenants can view own customers" on public.customers
  for all
  using (store_id = public.get_my_store_id());

-- STAFF
create policy "Tenants can view own staff" on public.staff
  for all
  using (store_id = public.get_my_store_id());

-- SERVICES (Assuming services are per-store)
create policy "Tenants can view own services" on public.services
  for all
  using (store_id = public.get_my_store_id());

-- SERVICE OPTIONS (Linked via service_id -> services -> store_id)
create policy "Tenants can view own service options" on public.service_options
  for select
  using (
    exists (
      select 1 from public.services
      where services.id = service_options.service_id
      and services.store_id = public.get_my_store_id()
    )
  );

-- BOOKING ITEMS (Linked via booking_id -> bookings -> store_id)
create policy "Tenants can view own booking items" on public.booking_items
  for all
  using (
    exists (
      select 1 from public.bookings
      where bookings.id = booking_items.booking_id
      and bookings.store_id = public.get_my_store_id()
    )
  );

-- Phase 7: SaaS Public Routing

-- 1. Add slug to stores
alter table public.stores
add column if not exists slug text;

-- 2. Backfill existing data
update public.stores
set slug = 'main'
where slug is null;

-- 3. Add constraint
alter table public.stores
alter column slug set not null;

-- Check constraint before adding to avoid error if re-running
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'stores_slug_unique') then
    alter table public.stores add constraint stores_slug_unique unique (slug);
  end if;
end $$;


-- 4. RLS for Public Access
-- Allow anonymous access to store basic info via View or API. 
-- We used strict RLS on `stores` below, so we need a bypass for public specific read.
-- Creating a view for public access:

create or replace view public.public_stores as
select id, name, slug, address, phone, email, business_hours, settings -> 'payment' as payment_info
from public.stores;

-- Grant access to view
grant select on public.public_stores to anon;
grant select on public.public_stores to authenticated;

-- Public can view Services and Options (Allow generic select? Or limit scopes?)
-- We already have "Tenants can view own services". That blocks public!
-- We need "Public can view services" for unrelated users (anon).

create policy "Public can view services" on public.services
  for select
  using (true);

create policy "Public can view service options" on public.service_options
  for select
  using (true);

-- And for looking up store by slug we use the helper logic or view.
-- RPC for slug lookup:
create or replace function public.get_store_id_by_slug(slug_input text)
returns table (id uuid, name text)
language sql
security definer
as $$
  select id, name from public.stores where slug = slug_input;
$$;


-- Phase 8: Admin Settings & RLS for Stores

-- 1. Enable RLS on stores
alter table public.stores enable row level security;

-- 2. Create Policies for Store Owners
-- View Own Store
create policy "Owners can view own store" on public.stores
  for select
  using (id = public.get_my_store_id());

-- Update Own Store (Settings, Profile)
create policy "Owners can update own store" on public.stores
  for update
  using (id = public.get_my_store_id());
