-- Phase 1.2: Fintech & Communication Loop Activation Prep
-- Date: 2024-12-21
-- Purpose: Add columns for Stripe, LINE, and Google Calendar integrations

-- 1. Organizations (HQ / Billing Level)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_account_id text, -- Stripe Connect Account ID (if HQ receives money)
ADD COLUMN IF NOT EXISTS stripe_customer_id text, -- For Billing the organization itself
ADD COLUMN IF NOT EXISTS line_channel_id text,
ADD COLUMN IF NOT EXISTS line_channel_secret text;

-- 2. Stores (Local Branch Level)
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS stripe_account_id text; -- Stripe Connect Account ID (if branch receives money)

-- 3. Staff (Individual Level)
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS google_refresh_token text; -- For Calendar Sync

-- 4. Bookings (Transaction Level)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_charge_id text,
ADD COLUMN IF NOT EXISTS application_fee_amount integer, -- Amber's 7% fee
ADD COLUMN IF NOT EXISTS review_sent_at timestamp with time zone, -- Automation tracker
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone; -- Automation tracker

-- 5. RLS Policies for new columns (Generally handled by existing policies, but good to check)
-- No new tables, so existing "active policy" on organizations/stores/staff will cover access to these columns.

COMMENT ON COLUMN public.bookings.application_fee_amount IS 'Platform fee (typically 7%) collected by Amber HQ';
COMMENT ON COLUMN public.organizations.stripe_account_id IS 'Stripe Connect Account ID for the organization (HQ)';
COMMENT ON COLUMN public.stores.stripe_account_id IS 'Stripe Connect Account ID for the store (Branch)';
