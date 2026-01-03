-- Migration: LINE LIFF Integration
-- Date: 2026-01-02
-- Description: Add UNIQUE constraints for customer data integrity and LINE profile columns

-- 1. Add LINE profile information columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS line_display_name TEXT,
ADD COLUMN IF NOT EXISTS line_picture_url TEXT;

-- 2. Add UNIQUE constraint for (organization_id, phone) WHERE phone IS NOT NULL
-- This ensures customer uniqueness at the organization level by phone number
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'customers_org_phone_unique' 
        AND conrelid = 'public.customers'::regclass
    ) THEN
        -- Add organization_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'customers' 
            AND column_name = 'organization_id'
        ) THEN
            -- Get organization_id from store_id
            ALTER TABLE public.customers 
            ADD COLUMN organization_id UUID;
            
            -- Populate organization_id from stores table
            UPDATE public.customers c
            SET organization_id = s.organization_id
            FROM public.stores s
            WHERE c.store_id = s.id
            AND c.organization_id IS NULL;
            
            -- Make organization_id NOT NULL after population
            ALTER TABLE public.customers 
            ALTER COLUMN organization_id SET NOT NULL;
        END IF;
        
        -- Create unique partial index for (organization_id, phone) WHERE phone IS NOT NULL
        CREATE UNIQUE INDEX IF NOT EXISTS customers_org_phone_unique 
        ON public.customers(organization_id, phone) 
        WHERE phone IS NOT NULL;
    END IF;
END $$;

-- 3. Ensure UNIQUE constraint for (organization_id, line_user_id) WHERE line_user_id IS NOT NULL
-- This ensures customer uniqueness at the organization level by LINE user ID
DO $$
BEGIN
    -- Check if line_user_id column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'line_user_id'
    ) THEN
        -- Check if constraint already exists
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_constraint 
            WHERE conname = 'customers_org_line_user_unique' 
            AND conrelid = 'public.customers'::regclass
        ) THEN
            -- Create unique partial index for (organization_id, line_user_id) WHERE line_user_id IS NOT NULL
            CREATE UNIQUE INDEX IF NOT EXISTS customers_org_line_user_unique 
            ON public.customers(organization_id, line_user_id) 
            WHERE line_user_id IS NOT NULL;
        END IF;
    END IF;
END $$;

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_line_user_id ON public.customers(line_user_id) WHERE line_user_id IS NOT NULL;

-- 5. Add comments for documentation
COMMENT ON COLUMN public.customers.line_display_name IS 'LINE display name from LIFF profile';
COMMENT ON COLUMN public.customers.line_picture_url IS 'LINE picture URL from LIFF profile';
COMMENT ON INDEX public.customers_org_phone_unique IS 'Ensures unique customer by organization_id and phone (where phone is not null)';
COMMENT ON INDEX public.customers_org_line_user_unique IS 'Ensures unique customer by organization_id and line_user_id (where line_user_id is not null)';

