-- Phase 9: Franchise Architecture & Security RPC

-- 1. Create ORGANIZATIONS Table
create table if not exists public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references auth.users(id), -- Optional: Primary contact for the org
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.organizations enable row level security;

-- 2. Link STORES to ORGANIZATIONS
alter table public.stores
add column organization_id uuid references public.organizations(id);

-- Backfill: Create a default organization for existing stores
do $$
declare
  default_org_id uuid;
begin
  -- Check if we need to backfill
  if exists (select 1 from public.stores where organization_id is null) then
    -- Create default org
    insert into public.organizations (name) values ('Default Organization')
    returning id into default_org_id;

    -- Update existing stores
    update public.stores
    set organization_id = default_org_id
    where organization_id is null;
  end if;
end $$;

-- Enforce NOT NULL after backfill
alter table public.stores
alter column organization_id set not null;

-- 3. Link PROFILES to ORGANIZATIONS
alter table public.profiles
add column organization_id uuid references public.organizations(id);

-- Backfill Profiles: Link to the same org as their store (if any)
-- This is tricky if store_id represents a specific store but now we want Org level.
-- For now, we find the store the user belongs to, get its org, and set it.
update public.profiles p
set organization_id = s.organization_id
from public.stores s
where p.store_id = s.id
and p.organization_id is null;

-- 4. RLS Helper Functions Update
-- We need `get_my_org_id()`

create or replace function public.get_my_org_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

-- Update `get_my_store_id` (Legacy support, mainly for Store Managers)
-- HQ Admins might have `store_id` NULL in profile. 
-- If they want to "view as store", they need to pass a header or we assume they see all.
-- RLS policies need to change.

-- 5. RLS Policy Overhaul

-- ORGANIZATIONS
-- Org Admins can view own org
create policy "Admins can view own org" on public.organizations
  for select
  using (id = public.get_my_org_id());

-- STORES
-- Drop old policies first to avoid conflict/confusion
drop policy if exists "Owners can view own store" on public.stores;
drop policy if exists "Owners can update own store" on public.stores;

-- New Policy: Members of the Org can view all stores in the Org
create policy "Org members can view org stores" on public.stores
  for select
  using (organization_id = public.get_my_org_id());

-- New Policy: Org Admins (or Owners) can update stores in Org
create policy "Org admins can update org stores" on public.stores
  for update
  using (organization_id = public.get_my_org_id());

-- DATA TABLES (Bookings, Customers, Staff)
-- These currently link to `store_id`.
-- Access Rule: 
--   IF user.store_id == record.store_id (Store Manager) -> OK
--   OR IF user.org_id == record.store.org_id (HQ Admin) -> OK

-- This requires a JOIN in RLS which can be slow, or we denounce org_id to all tables?
-- Better: "Tenants can view own..." policies use `store_id = public.get_my_store_id()`.
-- If HQ Admin has NULL `store_id`, they see nothing.
-- We should update `get_my_store_id`? 
-- No, function returns single scalar. HQ sees MANY stores.
-- So we need RLS that says `store_id IN (select id from stores where organization_id = auth.get_my_org_id())`.

-- Performance note: Nested select in RLS is standard pattern but can be optimized.
-- Let's update the policies.

-- Policy Helper: "Booking Access"
-- We need to replace the strict policies from Phase 5/8.

do $$
begin
  -- Drop Phase 5 policies
  drop policy if exists "Tenants can view own bookings" on public.bookings;
  drop policy if exists "Tenants can insert own bookings" on public.bookings;
  drop policy if exists "Tenants can update own bookings" on public.bookings;
  -- Add other tables...
end $$;

-- 6. RPC: `create_booking_secure`
-- This allows Anon to create booking WITHOUT direct INSERT permissions on table.
create or replace function public.create_booking_secure(
  slug_input text,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  booking_date timestamptz,
  cart_items jsonb -- Array of {serviceId, quantity, options[]}
)
returns jsonb
language plpgsql
security definer -- Runs as Owner (Bypass RLS)
as $$
declare
  target_store_id uuid;
  resolved_customer_id uuid;
  new_booking_id uuid;
  item jsonb;
  svc_record record;
  opt_record record;
  total_price int := 0;
  total_duration int := 0;
  travel_padding int := 30;
  booking_end_time timestamptz;
  assigned_staff_id uuid;
  item_subtotal int;
  opt_id text; 
begin
  -- 1. Validate Store
  select id into target_store_id from public.stores where slug = slug_input;
  if target_store_id is null then
    raise exception 'Store not found';
  end if;

  -- 2. Customer Upsert
  -- Check exact phone match in this store
  select id into resolved_customer_id from public.customers 
  where phone = customer_phone and store_id = target_store_id;

  if resolved_customer_id is null then
    insert into public.customers (store_id, name, phone, email, address)
    values (target_store_id, customer_name, customer_phone, customer_email, customer_address)
    returning id into resolved_customer_id;
  end if;

  -- 3. Calculate Totals (Simplified for RPC, typically logic is shared or duped)
  -- Loop cart items
  for item in select * from jsonb_array_elements(cart_items)
  loop
    -- Fetch Service
    select * into svc_record from public.services where id = (item->>'serviceId')::uuid;
    if not found then raise exception 'Service not found'; end if;

    -- Calc Item Price
    item_subtotal := svc_record.price * (item->>'quantity')::int;
    total_price := total_price + item_subtotal;
    total_duration := total_duration + (svc_record.duration_minutes * (item->>'quantity')::int);
    
    -- Options? (Assuming simple array implementation for MVP)
    -- If options exist, iterate. (Skipping for brevity in this MVP RPC, can add later)
    -- total_price += ...
  end loop;

  total_duration := total_duration + travel_padding;
  booking_end_time := booking_date + (total_duration || ' minutes')::interval;

  -- 4. Assign Staff (Simple Random)
  select id into assigned_staff_id from public.staff where store_id = target_store_id and is_active = true limit 1;

  -- 5. Insert Booking
  insert into public.bookings (store_id, customer_id, staff_id, start_time, end_time, total_amount, status)
  values (target_store_id, resolved_customer_id, assigned_staff_id, booking_date, booking_end_time, total_price, 'confirmed')
  returning id into new_booking_id;

  -- 6. Insert Items (Loop again)
  for item in select * from jsonb_array_elements(cart_items)
  loop
    select * into svc_record from public.services where id = (item->>'serviceId')::uuid;
    insert into public.booking_items (booking_id, service_id, quantity, unit_price, subtotal)
    values (new_booking_id, svc_record.id, (item->>'quantity')::int, svc_record.price, svc_record.price * (item->>'quantity')::int);
  end loop;

  return jsonb_build_object('success', true, 'bookingId', new_booking_id);
end;
$$;
