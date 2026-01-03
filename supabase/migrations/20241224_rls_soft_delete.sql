-- Phase 2-3: RLSポリシーの更新（deleted_at対応）
-- 既存RLSポリシーに deleted_at IS NULL 条件を追加

-- stores
-- 既存ポリシーを確認して更新（複数のポリシー名が存在する可能性があるため、主要なものを更新）
DROP POLICY IF EXISTS "Stores View Access" ON stores;
DROP POLICY IF EXISTS "Org members can view org stores" ON stores;
CREATE POLICY "Stores View Access" ON stores
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (deleted_at IS NULL)
  );

-- customers
DROP POLICY IF EXISTS "Customers Access" ON customers;
DROP POLICY IF EXISTS "Tenants can view own customers" ON customers;
CREATE POLICY "Customers Access" ON customers
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (deleted_at IS NULL)
  );

-- services
-- 公開SELECTポリシー（予約ページ用）にもdeleted_at条件を追加
DROP POLICY IF EXISTS "Services Public Select" ON services;
CREATE POLICY "Services Public Select" ON services
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- 管理用ポリシーも更新
DROP POLICY IF EXISTS "Services Manage Access" ON services;
CREATE POLICY "Services Manage Access" ON services
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (deleted_at IS NULL)
  );

-- staff
DROP POLICY IF EXISTS "Staff View Access" ON staff;
DROP POLICY IF EXISTS "Tenants can view own staff" ON staff;
CREATE POLICY "Staff View Access" ON staff
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (deleted_at IS NULL)
  );

-- bookings
-- 既存のBookings View Accessポリシーにdeleted_at条件を追加
-- 注意: 既存ポリシーが複数ある可能性があるため、主要なものを更新
-- Public Booking Insertはdeleted_at条件不要（新規作成時はdeleted_at IS NULLが保証される）

-- コメント追加
COMMENT ON COLUMN stores.deleted_at IS '論理削除: NULLでない場合は削除済み';
COMMENT ON COLUMN customers.deleted_at IS '論理削除: NULLでない場合は削除済み';
COMMENT ON COLUMN services.deleted_at IS '論理削除: NULLでない場合は削除済み';
COMMENT ON COLUMN staff.deleted_at IS '論理削除: NULLでない場合は削除済み';
COMMENT ON COLUMN bookings.deleted_at IS '論理削除: NULLでない場合は削除済み（統計用には保持）';












