-- Phase 1.3: Pricing Plans & Resource Limits
-- Date: 2024-12-21

-- 1. Organizations table extension
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'starter' CHECK (plan_type IN ('starter', 'growth', 'enterprise')),
ADD COLUMN IF NOT EXISTS max_stores integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_staff integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_house_assets integer DEFAULT 50;

-- 2. Trigger Function to Validate Resource Limits
CREATE OR REPLACE FUNCTION public.check_resource_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count integer;
    limit_value integer;
    org_id uuid;
BEGIN
    -- Determine Org ID and Table
    IF TG_TABLE_NAME = 'stores' THEN
        org_id := NEW.organization_id;
        SELECT count(*) INTO current_count FROM public.stores WHERE organization_id = org_id;
        SELECT max_stores INTO limit_value FROM public.organizations WHERE id = org_id;
    ELSIF TG_TABLE_NAME = 'staff' THEN
        org_id := NEW.organization_id;
        SELECT count(*) INTO current_count FROM public.staff WHERE organization_id = org_id;
        SELECT max_staff INTO limit_value FROM public.organizations WHERE id = org_id;
    ELSIF TG_TABLE_NAME = 'house_assets' THEN
        -- house_assets are linked to customers, which are linked to organizations
        -- Assuming NEW.customer_id is provided
        SELECT organization_id INTO org_id FROM public.customers WHERE id = NEW.customer_id;
        SELECT count(*) INTO current_count 
        FROM public.house_assets ha
        JOIN public.customers c ON ha.customer_id = c.id
        WHERE c.organization_id = org_id;
        SELECT max_house_assets INTO limit_value FROM public.organizations WHERE id = org_id;
    END IF;

    -- Compare
    IF current_count >= limit_value THEN
        RAISE EXCEPTION 'Plan limit reached for % (Max: %)', TG_TABLE_NAME, limit_value;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply Triggers
DROP TRIGGER IF EXISTS tr_limit_stores ON public.stores;
CREATE TRIGGER tr_limit_stores
BEFORE INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.check_resource_limit();

DROP TRIGGER IF EXISTS tr_limit_staff ON public.staff;
CREATE TRIGGER tr_limit_staff
BEFORE INSERT ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.check_resource_limit();

DROP TRIGGER IF EXISTS tr_limit_house_assets ON public.house_assets;
CREATE TRIGGER tr_limit_house_assets
BEFORE INSERT ON public.house_assets
FOR EACH ROW EXECUTE FUNCTION public.check_resource_limit();

-- 4. Set Initial Defaults for existing organizations (optional, if any exist)
UPDATE public.organizations
SET 
    plan_type = 'enterprise',
    max_stores = 999,
    max_staff = 999,
    max_house_assets = 9999
WHERE name = 'Default Organization' OR name = 'Amber' OR name = '株式会社Amber';
