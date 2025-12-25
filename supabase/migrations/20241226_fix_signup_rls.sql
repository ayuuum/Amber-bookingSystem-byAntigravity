-- ============================================================================
-- Fix RLS policies for signup functionality
-- ============================================================================
-- Purpose: 
--   Allow authenticated users to create organizations during signup
--   This is a fallback in case service role key is not available
-- Related Issue: Signup fails with "permission denied for table organizations"
-- Breaking Changes: なし（新規ポリシー追加のみ）
-- ============================================================================

-- ============================================================================
-- 1. Allow authenticated users to insert organizations
-- ============================================================================
-- This policy allows users to create their own organization during signup
-- The owner_id must match the authenticated user's ID
DROP POLICY IF EXISTS "Users can create own organization" ON public.organizations;
CREATE POLICY "Users can create own organization" ON public.organizations
    FOR INSERT
    WITH CHECK (
        owner_id = auth.uid()
    );

-- ============================================================================
-- 2. Allow authenticated users to insert profiles
-- ============================================================================
-- This policy allows users to create their own profile during signup
-- The profile id must match the authenticated user's ID
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (
        id = auth.uid()
    );

-- ============================================================================
-- Note: Service role key should still be used in signup API for better security
-- These policies are a fallback and provide additional security layer
-- 
-- IMPORTANT: Service role key (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS completely.
-- If you're using service role client and still getting permission errors, check:
-- 1. SUPABASE_SERVICE_ROLE_KEY environment variable is set correctly
-- 2. The key matches the service_role key from Supabase Dashboard > Settings > API
-- 3. The key has not been rotated or changed
-- ============================================================================

