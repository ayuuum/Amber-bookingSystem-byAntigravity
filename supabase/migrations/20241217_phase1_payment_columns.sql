-- Phase 1 Extension: Add Payment Status and Method to bookings

alter table public.bookings
add column payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
add column payment_method text default 'on_site' check (payment_method in ('on_site', 'credit_card', 'invoice'));

comment on column public.bookings.payment_status is 'Payment status: unpaid, paid, refunded';
comment on column public.bookings.payment_method is 'Payment method: on_site (manual), credit_card, invoice';
