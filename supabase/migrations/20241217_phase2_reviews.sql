-- Create Reviews Table
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(booking_id) -- One review per booking
);

-- RLS
alter table public.reviews enable row level security;
create policy "Reviews viewable by everyone" on public.reviews for select using (true);
create policy "Reviews insertable by public" on public.reviews for insert with check (true);
