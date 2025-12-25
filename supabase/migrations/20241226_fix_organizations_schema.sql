-- ============================================================================
-- Fix organizations table schema for signup functionality
-- ============================================================================
-- Purpose: 
--   Ensure all required columns exist in organizations table for signup
--   This fixes the error: "Could not find the 'max_house_assets' column"
-- Related Issue: Signup fails due to missing columns
-- Breaking Changes: なし（新規カラム追加のみ）
-- ============================================================================

-- ============================================================================
-- 1. Add slug column if not exists
-- ============================================================================
-- Required for organization URL routing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'slug'
    ) THEN
        ALTER TABLE public.organizations 
        ADD COLUMN slug text;
        
        -- Add unique constraint if not exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'organizations_slug_key'
        ) THEN
            ALTER TABLE public.organizations 
            ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 2. Add owner_id column if not exists
-- ============================================================================
-- Required for linking organization to user who created it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.organizations 
        ADD COLUMN owner_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- ============================================================================
-- 3. Add plan_type column if not exists
-- ============================================================================
-- Required for pricing plan management
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.organizations
        ADD COLUMN plan_type text DEFAULT 'starter' 
        CHECK (plan_type IN ('starter', 'growth', 'enterprise'));
    END IF;
END $$;

-- ============================================================================
-- 4. Add max_stores column if not exists
-- ============================================================================
-- Required for resource limit management
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'max_stores'
    ) THEN
        ALTER TABLE public.organizations
        ADD COLUMN max_stores integer DEFAULT 1;
    END IF;
END $$;

-- ============================================================================
-- 5. Add max_staff column if not exists
-- ============================================================================
-- Required for resource limit management
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'max_staff'
    ) THEN
        ALTER TABLE public.organizations
        ADD COLUMN max_staff integer DEFAULT 3;
    END IF;
END $$;

-- ============================================================================
-- 6. Add max_house_assets column if not exists
-- ============================================================================
-- Required for resource limit management (this is the missing column causing the error)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'max_house_assets'
    ) THEN
        ALTER TABLE public.organizations
        ADD COLUMN max_house_assets integer DEFAULT 50;
    END IF;
END $$;

-- ============================================================================
-- 7. Set default values for existing organizations
-- ============================================================================
-- Update existing organizations that might have NULL values
UPDATE public.organizations
SET 
    plan_type = COALESCE(plan_type, 'starter'),
    max_stores = COALESCE(max_stores, 1),
    max_staff = COALESCE(max_staff, 3),
    max_house_assets = COALESCE(max_house_assets, 50)
WHERE 
    plan_type IS NULL 
    OR max_stores IS NULL 
    OR max_staff IS NULL 
    OR max_house_assets IS NULL;

-- ============================================================================
-- 8. Add updated_at column if not exists (for consistency)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.organizations
        ADD COLUMN updated_at timestamp with time zone 
        DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- ============================================================================
-- 9. Create trigger for updated_at if not exists
-- ============================================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_organizations_updated_at ON public.organizations;
CREATE TRIGGER trigger_update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_organizations_updated_at();

