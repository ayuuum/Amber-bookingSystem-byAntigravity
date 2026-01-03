-- Add business_hours to stores table
-- Default is null (implies 24h or fallback hardcoded defaults, but we will treat null as default 9-18 in code for backward compat)

alter table public.stores
add column business_hours jsonb default '{"mon": ["09:00", "18:00"], "tue": ["09:00", "18:00"], "wed": ["09:00", "18:00"], "thu": ["09:00", "18:00"], "fri": ["09:00", "18:00"], "sat": ["09:00", "18:00"], "sun": null}';

comment on column public.stores.business_hours is 'Weekly business hours. Key: mon-sun. Value: [start, end] or null (closed)';
