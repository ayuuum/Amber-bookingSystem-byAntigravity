-- ============================================================================
-- Metadata Columns & Soft Delete Support
-- ============================================================================
-- Purpose: 
--   1. enum増殖を防ぐ逃げ道としてmetadataカラムを追加
--   2. 論理削除（deleted_at）をサポート
-- Related PRD: Section 4-1 (予約管理), Section 4-2 (顧客管理)
-- Breaking Changes: なし（新規カラム追加のみ）
-- ============================================================================

-- ============================================================================
-- 1. bookings テーブルに metadata カラム追加
-- ============================================================================
-- 【技術負債対策】将来の例外対応は enum を増やさず metadata で吸収
-- 例: { "special_request": "エレベーター使用不可", "custom_status": "..." }
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bookings_metadata ON public.bookings USING gin(metadata);

-- ============================================================================
-- 2. customers テーブルに metadata カラム追加
-- ============================================================================
-- 【技術負債対策】顧客の特殊な属性を enum ではなく metadata で管理
-- 例: { "preferred_contact_time": "evening", "allergies": ["pet"] }
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_customers_metadata ON public.customers USING gin(metadata);

-- ============================================================================
-- 3. stores テーブルに metadata カラム追加（既に settings があるが、追加で拡張性を確保）
-- ============================================================================
-- 【技術負債対策】店舗固有の設定を settings とは別に metadata で管理可能に
-- 例: { "custom_features": ["ai_booking"], "integration_config": {...} }
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_stores_metadata ON public.stores USING gin(metadata);

-- ============================================================================
-- 4. 論理削除サポート: deleted_at カラム追加
-- ============================================================================
-- 【技術負債対策】物理削除を避け、データの完全性と監査証跡を保持

-- bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON public.bookings(deleted_at) 
WHERE deleted_at IS NULL;

-- customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers(deleted_at) 
WHERE deleted_at IS NULL;

-- stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_stores_deleted_at ON public.stores(deleted_at) 
WHERE deleted_at IS NULL;

-- services
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_services_deleted_at ON public.services(deleted_at) 
WHERE deleted_at IS NULL;

-- staff
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON public.staff(deleted_at) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. RLSポリシーの更新: deleted_at IS NULL を条件に追加
-- ============================================================================
-- 【技術負債対策】論理削除されたレコードは自動的にアクセス不可に

-- 既存のRLSポリシーは手動で更新が必要（既存ポリシーを壊さないため、ここではコメントのみ）
-- 例: 
--   ALTER POLICY "Bookings View Access" ON public.bookings
--   USING (... AND deleted_at IS NULL);

-- 注意: 既存のRLSポリシーを一括変更すると影響範囲が大きいため、
--       必要に応じて個別に更新すること













