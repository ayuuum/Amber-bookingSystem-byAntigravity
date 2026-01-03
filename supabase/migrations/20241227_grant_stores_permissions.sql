-- Grant INSERT, UPDATE, DELETE permissions on stores table
-- RLS policies will control which rows can be accessed, but basic GRANT is required first

GRANT INSERT, UPDATE, DELETE ON public.stores TO authenticated;
-- SELECT is already granted in 20241223_add_max_capacity.sql








