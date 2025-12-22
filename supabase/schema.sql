-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ORGANIZATIONS: Root of tenancy
create table public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PROFILES: Extends Supabase auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  organization_id uuid references public.organizations(id), -- Main org
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
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  slug text,
  address text,
  phone text,
  email text,
  is_archived boolean default false,
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- STAFF_STORES: Many-to-many relationship for staff assignment
create table public.staff_stores (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references public.profiles(id) on delete cascade not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(staff_id, store_id)
);

-- SHIFTS: Staff availability
create table public.shifts (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  staff_id uuid references public.profiles(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SERVICES: Menu items provided by the store
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  description text,
  duration_minutes integer not null,
  price integer not null,
  is_active boolean default true,
  category text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SERVICE_OPTIONS: Options for services
create table public.service_options (
  id uuid default uuid_generate_v4() primary key,
  service_id uuid references public.services(id) on delete cascade not null,
  name text not null,
  price integer not null,
  duration_minutes integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HOUSE ASSETS: Customer assets (家カルテ)
create table public.house_assets (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  asset_type text not null,
  manufacturer text,
  model_number text,
  serial_number text,
  installed_at date,
  location_in_house text,
  notes text,
  image_urls text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BOOKINGS: Reservations
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  store_id uuid references public.stores(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete set null,
  service_id uuid references public.services(id) on delete restrict not null,
  staff_id uuid references public.profiles(id) on delete set null,
  
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  
  status text check (status in ('pending', 'confirmed', 'working', 'completed', 'cancelled')) default 'pending',
  channel text check (channel in ('web', 'line', 'phone', 'walk_in')) default 'web',
  
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INVOICES: Billing
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  amount integer not null,
  currency text default 'jpy',
  status text check (status in ('draft', 'issued', 'paid', 'void', 'overdue')) default 'draft',
  due_date date,
  stripe_invoice_id text,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS PREPARATION
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.staff_stores enable row level security;
alter table public.shifts enable row level security;
alter table public.services enable row level security;
alter table public.service_options enable row level security;
alter table public.house_assets enable row level security;
alter table public.bookings enable row level security;
alter table public.invoices enable row level security;

-- POLICIES (Placeholder / Basic)
create policy "Organizations are viewable by everyone" on public.organizations for select using (true);
create policy "Services are viewable by everyone" on public.services for select using (true);
create policy "Service Options are viewable by everyone" on public.service_options for select using (true);
create policy "Stores are viewable by everyone" on public.stores for select using (true);
create policy "Users can view own bookings" on public.bookings for select using (auth.uid() = customer_id);
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
