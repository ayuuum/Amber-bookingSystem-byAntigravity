-- ============================================================================
-- Fix Bookings RLS Policy to work with profiles table directly
-- ============================================================================
-- Purpose: Fix RLS policies for bookings table to work with profiles table
--          This is a temporary fix until JWT metadata sync is properly configured
-- Related PRD: Section 4-1 (予約管理), Section 7 (権限階層)
-- Breaking Changes: None
-- ============================================================================

-- Drop existing policies
drop policy if exists "Bookings View Access" on public.bookings;
drop policy if exists "Bookings Manage Access" on public.bookings;

-- ============================================================================
-- Policy: "Bookings View Access"
-- ============================================================================
-- Purpose: Control who can view bookings based on their role and organization
-- Access Pattern:
--   - org_admin: Can view all bookings in their organization
--   - store_manager: Can view bookings in their assigned store
--   - staff: Can view bookings assigned to them
-- Security: Uses profiles table to determine user's organization and role
-- Performance: Uses EXISTS subqueries (indexed on profiles.id and staff.profile_id)
-- ============================================================================
create policy "Bookings View Access" on public.bookings
  for select using (
    organization_id in (
      select organization_id 
      from public.profiles 
      where id = auth.uid()
    ) and (
      -- hq_admin can view all bookings in their org
      exists (
        select 1 from public.profiles 
        where id = auth.uid() 
        and role = 'hq_admin'
        and organization_id = bookings.organization_id
      ) or
      -- store_admin can view bookings in their store
      exists (
        select 1 from public.profiles 
        where id = auth.uid() 
        and role = 'store_admin'
        and organization_id = bookings.organization_id
        and store_id = bookings.store_id
      ) or
      -- staff can view bookings assigned to them
      exists (
        select 1 from public.staff 
        where profile_id = auth.uid()
        and id = bookings.staff_id
      )
    )
  );

-- ============================================================================
-- Policy: "Bookings Manage Access"
-- ============================================================================
-- Purpose: Control who can create/update/delete bookings
-- Access Pattern:
--   - hq_admin: Can manage all bookings in their organization
--   - store_admin: Can manage bookings in their assigned store
--   - field_staff: Cannot manage bookings (read-only)
-- Security: Only allows modifications within user's organization
-- ============================================================================
create policy "Bookings Manage Access" on public.bookings
  for all using (
    organization_id in (
      select organization_id 
      from public.profiles 
      where id = auth.uid()
    ) and (
      exists (
        select 1 from public.profiles 
        where id = auth.uid() 
        and role = 'hq_admin'
        and organization_id = bookings.organization_id
      ) or
      exists (
        select 1 from public.profiles 
        where id = auth.uid() 
        and role = 'store_admin'
        and organization_id = bookings.organization_id
        and store_id = bookings.store_id
      )
    )
  );

-- ============================================================================
-- Policy: "Public Booking Insert"
-- ============================================================================
-- Purpose: Allow public (unauthenticated) users to create bookings
--          This is required for the public booking form
-- Security: RPC function (create_booking_secure) validates and sanitizes input
-- Note: This policy allows inserts, but the RPC function enforces business rules
-- ============================================================================
drop policy if exists "Public Booking Insert" on public.bookings;
create policy "Public Booking Insert" on public.bookings
  for insert with check (true);


