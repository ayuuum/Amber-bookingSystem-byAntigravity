-- MASTER RESET SCRIPT (Optimized for Franchise/SaaS)
-- "The Best DB" Architecture
-- Feature Set: Multi-Tenant, SaaS, Cart Booking, Security, RLS, RPC

-- 1. Reset Schema
drop schema public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to anon;
grant all on schema public to authenticated;
grant all on schema public to service_role;

-- 2. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist"; 

-- 3. Top-Level Identity (Organizations)
create table public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.organizations enable row level security;

-- 4. Stores (Tenants)
create table public.stores (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  slug text not null unique,
  name text not null,
  address text,
  phone text,
  email text,
  business_hours jsonb default '{"mon": ["09:00", "18:00"], "tue": ["09:00", "18:00"], "wed": ["09:00", "18:00"], "thu": ["09:00", "18:00"], "fri": ["09:00", "18:00"], "sat": ["09:00", "18:00"], "sun": null}',
  settings jsonb default '{}', -- Payment settings, etc
  google_refresh_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.stores enable row level security;

-- 5. Profiles (Users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  organization_id uuid references public.organizations(id), -- Nullable for super-admin/unassigned
  store_id uuid references public.stores(id), -- Nullable for Org Admins
  role text check (role in ('admin', 'org_admin', 'store_manager', 'staff', 'customer')),
  full_name text,
  phone text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Authentication Helper
create or replace function public.get_my_org_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.profiles where id = auth.uid() limit 1;
$$;

-- 6. Business Tables (All have organization_id for efficient RLS)

-- SERVICES
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  title text not null,
  description text,
  price integer not null,
  duration_minutes integer not null,
  buffer_minutes integer not null default 30,
  image_url text,
  is_active boolean default true,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.services enable row level security;

-- SERVICE OPTIONS
create table public.service_options (
  id uuid default uuid_generate_v4() primary key,
  service_id uuid references public.services(id) on delete cascade not null,
  name text not null,
  price integer not null default 0,
  duration_minutes integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.service_options enable row level security;

-- STAFF
create table public.staff (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  google_calendar_id text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.staff enable row level security;

-- STAFF SCHEDULES
create table public.staff_schedules (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references public.staff(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  unique (staff_id, day_of_week)
);
alter table public.staff_schedules enable row level security;

create table public.staff_availability_overrides (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references public.staff(id) on delete cascade not null,
  target_date date not null,
  is_available boolean not null default false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.staff_availability_overrides enable row level security;

-- SERVICE AREAS
create table public.service_areas (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  prefecture text not null,
  city text not null,
  zip_code_prefix text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.service_areas enable row level security;

-- CUSTOMERS
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  line_user_id text,
  name text not null,
  phone text not null,
  email text,
  address text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.customers enable row level security;

-- BOOKINGS
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete restrict not null,
  staff_id uuid references public.staff(id) on delete set null,
  
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  
  total_amount integer default 0,
  status text not null default 'confirmed',
  payment_status text default 'unpaid',
  payment_method text default 'on_site',
  notes text,
  google_event_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint bookings_no_overlap exclude using gist (
    staff_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
);
alter table public.bookings enable row level security;

-- BOOKING ITEMS
create table public.booking_items (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete restrict not null,
  quantity integer not null default 1,
  unit_price integer not null,
  subtotal integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.booking_items enable row level security;

create table public.booking_item_options (
  id uuid default uuid_generate_v4() primary key,
  booking_item_id uuid references public.booking_items(id) on delete cascade not null,
  service_option_id uuid references public.service_options(id) on delete restrict not null,
  price integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.booking_item_options enable row level security;

-- 7. High-Performance RLS Policies (Org-Based)

-- Org/Store
create policy "Admin View Org" on public.organizations for select using (id = public.get_my_org_id());
create policy "Org View Store" on public.stores for select using (organization_id = public.get_my_org_id());
create policy "Org Update Store" on public.stores for update using (organization_id = public.get_my_org_id());

-- Business Data (Direct Org Check - FAST)
create policy "Org View Services" on public.services for all using (organization_id = public.get_my_org_id());
create policy "Org View Staff" on public.staff for all using (organization_id = public.get_my_org_id());
create policy "Org View Customers" on public.customers for all using (organization_id = public.get_my_org_id());
create policy "Org View Bookings" on public.bookings for all using (organization_id = public.get_my_org_id());

-- Public / Anon Policies
create policy "Public View Services" on public.services for select using (true);
create policy "Public View Options" on public.service_options for select using (true);
create policy "Public View Schedules" on public.staff_schedules for select using (true);
create policy "Public View Overrides" on public.staff_availability_overrides for select using (true);
create policy "Public View Areas" on public.service_areas for select using (true);
create policy "Public View Booking Items" on public.booking_items for select using (true); -- Needed for receipt/confirmation? Or restrict?
create policy "Public View Item Options" on public.booking_item_options for select using (true);

-- Public Store View
create or replace view public.public_stores as
select id, name, slug, address, phone, email, business_hours, settings -> 'payment' as payment_info
from public.stores;
grant select on public.public_stores to anon;
grant select on public.public_stores to authenticated;

-- 8. Functions & RPC

-- Secure Booking RPC
create or replace function public.create_booking_secure(
  slug_input text,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  booking_date timestamptz,
  cart_items jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  target_store_id uuid;
  target_org_id uuid;
  resolved_customer_id uuid;
  new_booking_id uuid;
  item jsonb;
  svc_record record;
  total_price int := 0;
  total_duration int := 0;
  travel_padding int := 30;
  booking_end_time timestamptz;
  assigned_staff_id uuid;
begin
  -- Resolve Store & Org
  select id, organization_id into target_store_id, target_org_id 
  from public.stores where slug = slug_input;
  
  if target_store_id is null then raise exception 'Store not found'; end if;

  -- Customer Upsert
  select id into resolved_customer_id from public.customers where phone = customer_phone and store_id = target_store_id;
  if resolved_customer_id is null then
    insert into public.customers (organization_id, store_id, name, phone, email, address)
    values (target_org_id, target_store_id, customer_name, customer_phone, customer_email, customer_address)
    returning id into resolved_customer_id;
  end if;

  -- Totals
  for item in select * from jsonb_array_elements(cart_items) loop
    select * into svc_record from public.services where id = (item->>'serviceId')::uuid;
    total_price := total_price + (svc_record.price * (item->>'quantity')::int);
    total_duration := total_duration + (svc_record.duration_minutes * (item->>'quantity')::int);
  end loop;
  
  total_duration := total_duration + travel_padding;
  booking_end_time := booking_date + (total_duration || ' minutes')::interval;

  -- Staff
  select id into assigned_staff_id from public.staff where store_id = target_store_id and is_active = true limit 1;

  -- Create Booking
  insert into public.bookings (organization_id, store_id, customer_id, staff_id, start_time, end_time, total_amount, status)
  values (target_org_id, target_store_id, resolved_customer_id, assigned_staff_id, booking_date, booking_end_time, total_price, 'confirmed')
  returning id into new_booking_id;

  -- Items
  for item in select * from jsonb_array_elements(cart_items) loop
    select * into svc_record from public.services where id = (item->>'serviceId')::uuid;
    insert into public.booking_items (booking_id, service_id, quantity, unit_price, subtotal)
    values (new_booking_id, svc_record.id, (item->>'quantity')::int, svc_record.price, svc_record.price * (item->>'quantity')::int);
  end loop;

  return jsonb_build_object('success', true, 'bookingId', new_booking_id);
end;
$$;

create or replace function public.get_store_id_by_slug(slug_input text)
returns table (id uuid, name text)
language sql
security definer
as $$
  select id, name from public.stores where slug = slug_input;
$$;

-- 9. Seeding
do $$
declare
  org_id uuid;
  store_id uuid;
begin
  insert into public.organizations (name) values ('Default Organization') returning id into org_id;
  
  insert into public.stores (organization_id, name, slug, address, phone)
  values (org_id, 'Haukuri Main Store', 'main', 'Tokyo, Japan', '03-1234-5678')
  returning id into store_id;

  insert into public.services (organization_id, store_id, title, price, duration_minutes) values
  (org_id, store_id, 'Standard Cleaning', 10000, 60),
  (org_id, store_id, 'Deep Cleaning', 18000, 120);
  
  insert into public.staff (organization_id, store_id, name) values (org_id, store_id, 'Staff A');
end $$;
