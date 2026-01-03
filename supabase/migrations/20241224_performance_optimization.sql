-- Performance Optimization: Add missing indexes for bookings queries

-- Index for bookings with organization_id and start_time (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_org_start_time 
ON public.bookings (organization_id, start_time DESC) 
WHERE status != 'cancelled';

-- Index for bookings with store_id and start_time (for store-specific queries)
CREATE INDEX IF NOT EXISTS idx_bookings_store_start_time_desc 
ON public.bookings (store_id, start_time DESC);

-- Index for customer lookups in bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id 
ON public.bookings (customer_id) 
WHERE customer_id IS NOT NULL;

-- Index for staff lookups in bookings
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id 
ON public.bookings (staff_id) 
WHERE staff_id IS NOT NULL;

-- Composite index for RLS policy performance (organization_id + store_id)
CREATE INDEX IF NOT EXISTS idx_bookings_org_store 
ON public.bookings (organization_id, store_id);

-- Index for profiles table lookups (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_profiles_org_role 
ON public.profiles (organization_id, role) 
WHERE organization_id IS NOT NULL;

-- Index for staff table lookups (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_staff_profile_org 
ON public.staff (profile_id, organization_id) 
WHERE profile_id IS NOT NULL;

-- Index for booking_items to speed up joins
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_service 
ON public.booking_items (booking_id, service_id);

-- Index for booking_item_options
CREATE INDEX IF NOT EXISTS idx_booking_item_options_item 
ON public.booking_item_options (booking_item_id);














