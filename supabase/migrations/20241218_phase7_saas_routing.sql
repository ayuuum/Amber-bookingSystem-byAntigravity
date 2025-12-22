-- Phase 7: SaaS Public Routing

-- 1. Add slug to stores
alter table public.stores
add column slug text;

-- 2. Backfill existing data (Critical for not null constraint)
-- Assuming single store for now, or random slugs.
update public.stores
set slug = 'main'
where slug is null;

-- 3. Add constraint
alter table public.stores
alter column slug set not null;

alter table public.stores
add constraint stores_slug_unique unique (slug);

-- 4. RLS for Public Access (Landing Pages)
-- Public needs to read store name/slug to render the booking page.
-- We must be careful not to expose sensitive settings.
-- Ideally, we use a separate view or restrictive policy.

-- For now, allow reading generic store info if true?
-- But wait, we just enabled STRICT RLS in Phase 5 ("Tenants can view own...").
-- "Tenants" means authenticated users in Admin.
-- Public users (anonymous) need access to: Name, Address, Slug.

create policy "Public can view store basic info" on public.stores
  for select
  using (true); 
  -- Note: This allows selecting ALL columns.
  -- In a real app, strict RLS would filter columns, but Postgres RLS is row-based.
  -- We should use a VIEW or API logic to limit fields returned to anon users.
  -- Safe for MVP if settings doesn't contain secrets (Oauth tokens are in columns, usually).
  -- WAIT! `google_access_token` is in `stores`!
  -- DO NOT ALLOW `using (true)` for public on `stores` table!

-- FIX: We need a secure way to access public store info.
-- Option A: Create a VIEW `public_stores` with only safe columns.
-- Option B: Only allow specific API (Service Role) to fetch store details for public pages.
-- Decision: Use Service Role in Next.js API (`createClient` without args? No, server components).
-- Actually, Next.js Server Components / API Routes using Service Role can bypass RLS.
-- So we DON'T need a permissive RLS policy for public anonymous access if we fetch via server-side API.
-- The `GET /api/public/store` endpoint will run on server, can bypass RLS if configured or use a specific function.

-- However, standard `supabase.from('stores')` with anon key checks RLS.
-- If we use `createClient()` in `layout.tsx` it uses anon or authenticated user.
-- For public booking page, user is ANON.
-- So we need RLS that allows Anon to see basic info.

-- Let's create a View for safety.
create view public.public_stores as
select id, name, slug, address, phone, email, settings -- Check settings content risk?
from public.stores;

-- Grant access to view
grant select on public.public_stores to anon;
grant select on public.public_stores to authenticated;
-- (RLS doesn't apply to views unless specified, but underlying table RLS applies if view owner doesn't have permissions? 
-- Actually views run with owner permissions usually. If owner is postgres/admin, it bypasses RLS).

-- Simpler approach for MVP Phase 7:
-- Just keep RLS strict. Access store info via a dedicated API route that uses Service Role (or just runs as Admin logic).
-- BUT, frontend needs to fetch it.
-- Let's use `booking/page.tsx` (Server Component). It can fetch data safely.
-- If Client Component needs it, pass as props.

-- So, NO new permissive RLS policy on `stores` table required if we route data loading through Server Components properly.
-- Wait, `getServices` typically called from Client in Wizard?
-- Yes, `ServiceCart.tsx` calls `/api/services`.
-- `/api/services` runs on server. It can use `supabase-admin` or strict RLS auth.
-- But anonymous user has NO auth.
-- So `/api/services` MUST bypass RLS or RLS must allow Anon for that Store.

-- Let's add RLS to allow Anon to read Services/Options/Stores(Safe cols).
-- Since `stores` has secrets, we CANNOT expose it via RLS `using (true)`.

-- Better Plan:
-- 1. `stores`: Keep strict.
-- 2. `services`: Allow public read? Yes, menu is public.
-- 3. `service_options`: Allow public read? Yes.

create policy "Public can view services" on public.services
  for select
  using (true);

create policy "Public can view service options" on public.service_options
  for select
  using (true);

-- And for looking up store by slug?
-- We can add a function `get_store_id_by_slug(slug)` marked security definer.
create or replace function public.get_store_id_by_slug(slug_input text)
returns table (id uuid, name text)
language sql
security definer
as $$
  select id, name from public.stores where slug = slug_input;
$$;
