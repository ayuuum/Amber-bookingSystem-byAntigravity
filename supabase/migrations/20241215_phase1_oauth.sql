-- Phase 1 Migration: Add Google OAuth tokens to stores table

alter table public.stores
add column google_refresh_token text,
add column google_access_token text,
add column google_token_expiry bigint; -- Timestamp in milliseconds

-- Security note: In a real production app, these tokens should be encrypted.
-- Supabase Vault is a good option, but for Phase 1 MVP we verify functionality first.
