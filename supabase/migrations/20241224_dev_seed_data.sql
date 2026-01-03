-- Development Seed Data Migration
-- This migration creates demo data for development/testing purposes

-- 0. Ensure organizations table has slug column
do $$
begin
    if not exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'organizations' 
        and column_name = 'slug'
    ) then
        alter table public.organizations add column slug text unique;
    end if;
end $$;

-- 1. Create a function to seed demo data (bypasses RLS)
create or replace function public.seed_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    org_id uuid;
    store_id uuid;
    org_slug text := 'demo-org';
    store_slug text := 'demo-store';
begin
    -- Check if demo org already exists
    select id into org_id
    from public.organizations
    where slug = org_slug
    limit 1;

    -- Create organization if not exists
    if org_id is null then
        insert into public.organizations (name, slug)
        values ('デモ組織', org_slug)
        returning id into org_id;
    end if;

    -- Check if demo store already exists
    select id into store_id
    from public.stores
    where slug = store_slug
    limit 1;

    -- Create store if not exists
    if store_id is null then
        insert into public.stores (organization_id, name, slug, address, phone, email)
        values (org_id, 'Amber House デモ店舗', store_slug, '東京都渋谷区', '03-1234-5678', 'demo@amber-house.jp')
        returning id into store_id;
    end if;

    -- Create services if not exist
    insert into public.services (organization_id, store_id, title, price, duration_minutes, description, is_active)
    values
        (org_id, store_id, 'エアコンクリーニング', 12000, 90, '壁掛けエアコンの徹底洗浄。深層部まで清掃し、清潔な空気環境を提供します。', true),
        (org_id, store_id, 'キッチン・レンジフード', 15000, 120, '頑固な油汚れを完全除去。換気扇の内部まで徹底的に清掃し、清潔な調理環境を実現します。', true),
        (org_id, store_id, '浴室クリーニング', 10000, 90, 'カビと水垢を極限まで除去。毎日の入浴がより快適になります。', true),
        (org_id, store_id, '水回りセット（キッチン＋浴室）', 23000, 180, 'キッチンと浴室のお得なセットプラン。まとめて清掃でさらにお得です。', true)
    on conflict do nothing;

    -- Create staff if not exist
    insert into public.staff (organization_id, store_id, name, is_active)
    values
        (org_id, store_id, '佐藤', true),
        (org_id, store_id, '鈴木', true)
    on conflict do nothing;

    return jsonb_build_object(
        'success', true,
        'orgSlug', org_slug,
        'storeSlug', store_slug
    );
end;
$$;

-- 2. Grant execute permission to anon users (for development only)
grant execute on function public.seed_demo_data() to anon, authenticated;

-- 3. Add RLS policies for public read access (for development)
-- Allow anon users to read organizations and stores for demo purposes
drop policy if exists "Public can view demo organizations" on public.organizations;
create policy "Public can view demo organizations" on public.organizations
    for select
    using (slug = 'demo-org');

drop policy if exists "Public can view demo stores" on public.stores;
create policy "Public can view demo stores" on public.stores
    for select
    using (slug = 'demo-store' or organization_id in (
        select id from public.organizations where slug = 'demo-org'
    ));

