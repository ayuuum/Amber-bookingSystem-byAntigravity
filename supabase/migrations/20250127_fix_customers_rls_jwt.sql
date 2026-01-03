-- ============================================================================
-- Fix Customers RLS Policy to use auth.jwt_*() functions
-- ============================================================================
-- Purpose: Fix RLS policies for customers table to use JWT metadata functions
--          instead of JOINing profiles table, which causes permission errors
--          when customers table is JOINed in bookings queries
-- Related Issue: "permission denied for table customers" errors
-- Breaking Changes: None (policy behavior should be equivalent)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Customers Access" ON customers;
DROP POLICY IF EXISTS "Tenants can view own customers" ON customers;
DROP POLICY IF EXISTS "Store members can view customers" ON customers;
DROP POLICY IF EXISTS "Store admins can manage customers" ON customers;

-- ============================================================================
-- Policy: "Customers Access"
-- ============================================================================
-- Purpose: Control access to customers table based on JWT metadata
-- Access Pattern:
--   - hq_admin: Can access all customers in their organization
--   - store_admin: Can access customers in their assigned store
--   - field_staff: Can view customers in their store (read-only)
-- Security: Uses auth.jwt_*() functions to avoid profiles table JOIN
-- Performance: Avoids expensive JOIN operations in RLS policy evaluation
-- ============================================================================
CREATE POLICY "Customers Access" ON customers
  FOR ALL
  USING (
    organization_id = auth.jwt_org_id()
    AND (
      auth.jwt_role() = 'hq_admin' OR
      (auth.jwt_role() = 'store_admin' AND store_id = auth.jwt_store_id()) OR
      (auth.jwt_role() = 'field_staff' AND store_id = auth.jwt_store_id())
    )
    AND (deleted_at IS NULL)
  )
  WITH CHECK (
    organization_id = auth.jwt_org_id()
    AND (
      auth.jwt_role() = 'hq_admin' OR
      (auth.jwt_role() = 'store_admin' AND store_id = auth.jwt_store_id())
    )
    AND (deleted_at IS NULL)
  );

-- ============================================================================
-- Note: If JWT metadata is not synced, this policy will fail
-- Ensure that the trigger on_profile_update_sync_auth is working correctly
-- and that existing users have their metadata synced
-- ============================================================================







