-- Migration: Add max_capacity to stores table for simplified booking logic
-- Phase 1 MVP: Capacity-based availability instead of staff-based scheduling

-- Add max_capacity column
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 3;

COMMENT ON COLUMN public.stores.max_capacity IS 
'Maximum number of concurrent bookings the store can handle at any given time. Used for simplified capacity-based availability calculation in Phase 1.';

-- Make staff_id nullable in bookings (allow unassigned bookings)
ALTER TABLE public.bookings 
ALTER COLUMN staff_id DROP NOT NULL;

COMMENT ON COLUMN public.bookings.staff_id IS 
'Assigned staff member. NULL = unassigned (to be determined by manager post-booking). Phase 1 uses capacity-based booking without pre-assignment.';

-- Update existing stores to have a default capacity
UPDATE public.stores 
SET max_capacity = 3 
WHERE max_capacity IS NULL;

-- Grant necessary permissions
GRANT SELECT ON public.stores TO anon, authenticated;
