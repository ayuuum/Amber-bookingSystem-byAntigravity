-- Migration: Fix Critical Technical Issues
-- Created: 2025-12-21
-- Issues Fixed:
--   1. EXCLUDE constraint not excluding cancelled bookings
--   2. Add expires_at for payment TTL
--   3. Add cancellation_reason for tracking

-- ============================================
-- 1. FIX EXCLUDE CONSTRAINT
-- ============================================

-- Drop the existing constraint (it includes cancelled bookings)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- Add is_active column to simplify constraint (default true, false when cancelled)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing cancelled bookings
UPDATE public.bookings SET is_active = false WHERE status = 'cancelled';

-- Create new EXCLUDE constraint that only applies to active bookings
-- Using partial index approach with a generated column
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_no_overlap_active 
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
) WHERE (is_active = true);

-- ============================================
-- 2. ADD TTL COLUMNS FOR PAYMENT PENDING
-- ============================================

-- expires_at: When the pending_payment reservation expires
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- cancellation_reason: Why the booking was cancelled
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- refund tracking columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_at TIMESTAMPTZ;

-- ============================================
-- 3. ADD TRIGGER TO SYNC is_active WITH status
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_booking_is_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Set is_active based on status
  IF NEW.status = 'cancelled' THEN
    NEW.is_active := false;
  ELSE
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_booking_is_active ON public.bookings;
CREATE TRIGGER trg_sync_booking_is_active
  BEFORE INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_booking_is_active();

-- ============================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index for TTL job (finding expired pending_payment bookings)
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at 
ON public.bookings (expires_at) 
WHERE status = 'pending_payment' AND expires_at IS NOT NULL;

-- Index for active bookings lookup
CREATE INDEX IF NOT EXISTS idx_bookings_active_staff_time 
ON public.bookings (staff_id, start_time, end_time) 
WHERE is_active = true;

-- ============================================
-- 5. PAYMENT TIMEOUT CLEANUP FUNCTION
-- ============================================

-- Function to be called by cron job (1 minute interval)
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_payments()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.bookings
  SET 
    status = 'cancelled',
    cancellation_reason = 'payment_timeout',
    is_active = false
  WHERE 
    status = 'pending_payment'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. UPDATE STATUS CHECK CONSTRAINT
-- ============================================

-- Add new status values to match PRD
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'pending_payment', 'confirmed', 'working', 'completed', 'cancelled'));

-- ============================================
-- 7. ADD CHANNEL VALUES TO MATCH PRD
-- ============================================

-- Add channel column if not exists with correct values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN channel TEXT DEFAULT 'web';
  END IF;
END $$;

-- Add/update constraint for channel values
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_channel_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_channel_check 
CHECK (channel IN ('web', 'line', 'phone', 'walk_in'));
