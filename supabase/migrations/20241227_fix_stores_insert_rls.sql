-- Fix Stores RLS Policy for INSERT operations
-- The current "Stores Manage Access" policy uses FOR ALL with only USING clause,
-- which doesn't cover INSERT operations. We need to add WITH CHECK clause.

-- Drop existing policy
DROP POLICY IF EXISTS "Stores Manage Access" ON stores;

-- Create new policy with separate clauses for different operations
-- USING: for SELECT, UPDATE, DELETE (checks existing rows)
-- WITH CHECK: for INSERT, UPDATE (checks new/modified rows)

CREATE POLICY "Stores Manage Access" ON stores
  FOR ALL
  USING (
    -- For SELECT, UPDATE, DELETE: check existing rows
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'hq_admin'
        AND organization_id = stores.organization_id
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'store_admin'
        AND organization_id = stores.organization_id
        AND store_id = stores.id
      )
    )
  )
  WITH CHECK (
    -- For INSERT, UPDATE: check new/modified rows
    -- organization_id must match user's organization
    -- Note: In WITH CHECK, we reference the column directly (the row being inserted/updated)
    -- The inserted/updated row's organization_id must match the user's organization_id
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      -- hq_admin: can create/update any store in their organization
      -- Check that user is hq_admin and their org matches the row's org
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'hq_admin'
        AND profiles.organization_id = organization_id
      ) OR
      -- store_admin: can create stores in their organization
      -- For UPDATE: USING clause already ensures they can only update their own store
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'store_admin'
        AND profiles.organization_id = organization_id
      )
    )
  );

