-- Phase 1.1: Multi-tenant Scaling - Security & RLS Update

-- 1. Helper Functions to extract metadata from JWT
-- これにより、RLS ポリシーごとに profiles テーブルを JOIN する必要がなくなり、パフォーマンスが向上します。
create or replace function auth.jwt_role() returns text as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', ''), 'customer');
$$ language sql stable;

create or replace function auth.jwt_org_id() returns uuid as $$
  select (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'org_id')::uuid;
$$ language sql stable;

create or replace function auth.jwt_store_id() returns uuid as $$
  select (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'store_id')::uuid;
$$ language sql stable;

-- 2. Trigger to sync profiles to auth.users.raw_app_meta_data
-- profiles テーブルのロールや組織情報が変更された際、自動的に Supabase Auth のメタデータに同期します。
create or replace function public.handle_profile_update_sync_auth()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  update auth.users
  set raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', new.role,
      'org_id', new.organization_id,
      'store_id', new.store_id
    )
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_profile_update_sync_auth on public.profiles;
create trigger on_profile_update_sync_auth
  after insert or update of role, organization_id, store_id on public.profiles
  for each row execute function public.handle_profile_update_sync_auth();

-- 初期データ同期（既存のプロフィールをメタデータに反映）
do $$
declare
  r record;
begin
  for r in select * from public.profiles loop
    update auth.users
    set raw_app_meta_data = 
      coalesce(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', r.role,
        'org_id', r.organization_id,
        'store_id', r.store_id
      )
    where id = r.id;
  end loop;
end $$;

-- 3. RLS Policies Overhaul

-- 全テーブルの既存ポリシーを一旦整理（競合防止のため）
-- 注意: 本番環境では drop policy を慎重に行う必要がありますが、初期構築フェーズのため一括処理します。

-- [ORGANIZATIONS]
drop policy if exists "Admin View Org" on public.organizations;
create policy "Organizations View Access" on public.organizations
  for select using (id = auth.jwt_org_id());
create policy "Organizations Manage Access" on public.organizations
  for update using (id = auth.jwt_org_id() and auth.jwt_role() = 'org_admin');

-- [STORES]
drop policy if exists "Org View Store" on public.stores;
drop policy if exists "Org Update Store" on public.stores;
create policy "Stores View Access" on public.stores
  for select using (organization_id = auth.jwt_org_id());
create policy "Stores Manage Access" on public.stores
  for all using (
    organization_id = auth.jwt_org_id() and (
      auth.jwt_role() = 'org_admin' or 
      (auth.jwt_role() = 'store_manager' and id = auth.jwt_store_id())
    )
  );

-- [BOOKINGS]
drop policy if exists "Org View Bookings" on public.bookings;
create policy "Bookings View Access" on public.bookings
  for select using (
    organization_id = auth.jwt_org_id() and (
      auth.jwt_role() = 'org_admin' or
      (auth.jwt_role() = 'store_manager' and store_id = auth.jwt_store_id()) or
      (auth.jwt_role() = 'staff' and staff_id in (select id from public.staff where profile_id = auth.uid())) -- staffテーブルがprofile_idを持つ場合
    )
  );
create policy "Bookings Manage Access" on public.bookings
  for all using (
    organization_id = auth.jwt_org_id() and (
      auth.jwt_role() = 'org_admin' or
      (auth.jwt_role() = 'store_manager' and store_id = auth.jwt_store_id())
    )
  );
-- Public Insert は RPC (create_booking_secure) 経由を推奨するため、直接の Insert は制限または慎重に許可
create policy "Public Booking Insert" on public.bookings
  for insert with check (true);

-- [CUSTOMERS]
drop policy if exists "Org View Customers" on public.customers;
create policy "Customers Access" on public.customers
  for all using (
    organization_id = auth.jwt_org_id() and (
      auth.jwt_role() = 'org_admin' or
      (auth.jwt_role() = 'store_manager' and store_id = auth.jwt_store_id())
    )
  );

-- [SERVICES]
drop policy if exists "Org View Services" on public.services;
drop policy if exists "Public View Services" on public.services;
create policy "Services Public Select" on public.services for select using (is_active = true);
create policy "Services Manage Access" on public.services
  for all using (
    organization_id = auth.jwt_org_id() and (
      auth.jwt_role() = 'org_admin' or
      (auth.jwt_role() = 'store_manager' and store_id = auth.jwt_store_id())
    )
  );

-- [STAFF]
-- 既存の staff テーブルに profile_id がない場合は追加し、ログインユーザーと紐付けられるようにします。
alter table public.staff add column if not exists profile_id uuid references public.profiles(id);

drop policy if exists "Org View Staff" on public.staff;
create policy "Staff View Access" on public.staff
  for select using (organization_id = auth.jwt_org_id());
create policy "Staff Manage Access" on public.staff
  for all using (
    organization_id = auth.jwt_org_id() and (
      auth.jwt_role() = 'org_admin' or
      (auth.jwt_role() = 'store_manager' and store_id = auth.jwt_store_id())
    )
  );

-- [BOOKINGS] 追記 (Staff 向け権限の修正)
drop policy if exists "Bookings View Access" on public.bookings;
create policy "Bookings View Access" on public.bookings
  for select using (
    organization_id = auth.jwt_org_id() and (
      auth.jwt_role() = 'org_admin' or
      (auth.jwt_role() = 'store_manager' and store_id = auth.jwt_store_id()) or
      (auth.jwt_role() = 'staff' and staff_id in (select id from public.staff where profile_id = auth.uid()))
    )
  );
