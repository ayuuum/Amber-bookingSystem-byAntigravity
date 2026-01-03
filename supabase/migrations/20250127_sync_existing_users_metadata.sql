-- ============================================================================
-- Sync existing users' app_metadata from profiles table
-- ============================================================================
-- Purpose: Ensure all existing users have their profile data synced to
--          JWT app_metadata so that auth.jwt_*() functions work correctly
-- Related Issue: JWT app_metadata may be missing for existing users
-- Breaking Changes: None
-- ============================================================================

-- Sync all existing profiles to auth.users.raw_app_meta_data
DO $$
DECLARE
    r RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR r IN 
        SELECT 
            p.id,
            p.role,
            p.organization_id,
            p.store_id
        FROM public.profiles p
        WHERE p.id IS NOT NULL
    LOOP
        -- Update auth.users metadata
        UPDATE auth.users
        SET raw_app_meta_data = 
            COALESCE(raw_app_meta_data, '{}'::jsonb) || 
            jsonb_build_object(
                'role', COALESCE(r.role, 'customer'),
                'org_id', r.organization_id,
                'store_id', r.store_id
            )
        WHERE id = r.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Synced metadata for % users', updated_count;
END $$;

-- ============================================================================
-- Note: This migration ensures that all existing users have their metadata
--       synced. New users will have their metadata synced automatically
--       via the trigger on_profile_update_sync_auth
-- ============================================================================







