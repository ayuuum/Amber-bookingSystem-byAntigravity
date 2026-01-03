
-- Seed default schedules for all staff members who don't have one yet.
-- This sets 9:00 - 18:00 for Monday to Saturday.

INSERT INTO public.staff_schedules (staff_id, day_of_week, start_time, end_time)
SELECT 
    s.id as staff_id,
    d.day as day_of_week,
    '09:00:00'::time as start_time,
    '18:00:00'::time as end_time
FROM 
    public.staff s
CROSS JOIN 
    (SELECT generate_series(0, 6) as day) d  -- 0=Sunday, 1=Monday, ..., 6=Saturday
ON CONFLICT (staff_id, day_of_week) DO UPDATE 
SET 
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;

-- Ensure RLS allows public viewing of these schedules (Required for public booking)
-- Ensure RLS allows public viewing of these tables (Required for public booking)
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.service_options TO anon, authenticated;
GRANT SELECT ON public.staff TO anon, authenticated;
GRANT SELECT ON public.staff_schedules TO anon, authenticated;
GRANT SELECT ON public.staff_availability_overrides TO anon, authenticated;
GRANT SELECT ON public.bookings TO anon, authenticated;

-- Ensure staff is active
UPDATE public.staff SET is_active = true WHERE is_active IS NULL;
