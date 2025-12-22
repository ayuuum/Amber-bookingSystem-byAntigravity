-- Phase 2: SaaS Architecture Refinement

-- 1. Enable Extension for Exclusion Constraints
create extension if not exists btree_gist;

-- 2. Staff Schedules (Base Shifts)
create table public.staff_schedules (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references public.staff(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (staff_id, day_of_week) -- One shift definition per day per staff
);

-- 3. Staff Availability Overrides (Exceptions)
create table public.staff_availability_overrides (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references public.staff(id) on delete cascade not null,
  target_date date not null,
  is_available boolean not null default false, -- If true, can encompass "extra shift". If false, "day off".
  start_time time, -- Required if is_available is true
  end_time time,   -- Required if is_available is true
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Service Areas
create table public.service_areas (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  prefecture text not null,
  city text not null,
  zip_code_prefix text not null, -- e.g. "100"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Modifications to Services
alter table public.services 
add column buffer_minutes integer not null default 30;

-- 6. Modifications to Bookings (Exclusion Constraint)
-- Prevent overlapping bookings for the same staff
-- Note: We need to cast timestamp to range.
-- The range is [start_time, end_time).
-- We assume start_time and end_time are timestamptz.
alter table public.bookings
add constraint bookings_no_overlap
exclude using gist (
  staff_id with =,
  tstzrange(start_time, end_time, '[)') with &&
);

-- 7. RLS Policies
alter table public.staff_schedules enable row level security;
alter table public.staff_availability_overrides enable row level security;
alter table public.service_areas enable row level security;

create policy "Schedules viewable by public" on public.staff_schedules for select using (true);
create policy "Overrides viewable by public" on public.staff_availability_overrides for select using (true);
create policy "Areas viewable by public" on public.service_areas for select using (true);

-- Admin write access (simplified for MVP: allow all authenticated or just strict)
-- For now, we reuse the "trust" model or simple auth check if implemented previously.
