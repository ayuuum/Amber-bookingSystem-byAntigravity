-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES: Extends Supabase auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  role text check (role in ('admin', 'staff', 'customer')) default 'customer',
  full_name text,
  phone text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- STORES: Store information
create table public.stores (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  phone text,
  email text,
  settings jsonb default '{}'::jsonb, -- Store specific settings like business hours
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SERVICES: Menu items provided by the store
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  description text,
  duration_minutes integer not null, -- Duration in minutes
  price integer not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BOOKINGS: Reservations
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete set null,
  service_id uuid references public.services(id) on delete restrict not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null, -- Calculated from start_time + service duration
  status text check (status in ('pending', 'confirmed', 'cancelled', 'completed')) default 'pending',
  customer_name text, -- Snapshot in case profile is deleted or for guest bookings
  customer_email text,
  customer_phone text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;

-- Policies (Simplified for initial setup)
-- Allow read access to services for everyone
create policy "Services are viewable by everyone" on public.services for select using (true);
