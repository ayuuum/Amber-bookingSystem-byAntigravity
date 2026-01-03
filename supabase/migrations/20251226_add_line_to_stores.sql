-- 店舗ごとのLINE公式アカウント連携情報を追加
-- Date: 2025-12-26
-- Purpose: 各店舗が独自のLINE公式アカウントと連携できるようにする

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS line_channel_access_token text,
ADD COLUMN IF NOT EXISTS line_channel_secret text;

COMMENT ON COLUMN public.stores.line_channel_access_token IS 'LINE Messaging API Channel Access Token (店舗ごと)';
COMMENT ON COLUMN public.stores.line_channel_secret IS 'LINE Messaging API Channel Secret (店舗ごと)';







