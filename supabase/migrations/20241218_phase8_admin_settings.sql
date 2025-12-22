-- Phase 8: Admin Settings & RLS for Stores

-- 1. Enable RLS on stores (if not already enabled)
alter table public.stores enable row level security;

-- 2. Drop existing policies if strictly replacing
-- We might have "Public can view store basic info" from Phase 7 (if applied).
-- Phase 7 didn't actually create a policy on `stores`, it created a VIEW `public_stores`.
-- So `stores` table might have NO policies or just default deny.

-- 3. Create Policies for Store Owners
-- View Own Store
create policy "Owners can view own store" on public.stores
  for select
  using (id = auth.get_my_store_id());

-- Update Own Store (Settings, Profile)
create policy "Owners can update own store" on public.stores
  for update
  using (id = auth.get_my_store_id());
