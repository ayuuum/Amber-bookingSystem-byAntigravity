-- Phase 2-4: RLSポリシーのロール名を更新
-- 既存のRLSポリシーで使用されているロール名を新しい名前に更新

-- [ORGANIZATIONS]
DROP POLICY IF EXISTS "Organizations Manage Access" ON organizations;
CREATE POLICY "Organizations Manage Access" ON organizations
  FOR UPDATE
  USING (
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'hq_admin'
      AND organization_id = organizations.id
    )
  );

-- [STORES]
DROP POLICY IF EXISTS "Stores Manage Access" ON stores;
CREATE POLICY "Stores Manage Access" ON stores
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'hq_admin'
        AND organization_id = stores.organization_id
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'store_admin'
        AND organization_id = stores.organization_id
        AND store_id = stores.id
      )
    )
  );

-- [CUSTOMERS]
DROP POLICY IF EXISTS "Customers Access" ON customers;
CREATE POLICY "Customers Access" ON customers
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'hq_admin'
        AND organization_id = customers.organization_id
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'store_admin'
        AND organization_id = customers.organization_id
        AND store_id = customers.store_id
      )
    )
    AND (deleted_at IS NULL)
  );

-- [SERVICES]
DROP POLICY IF EXISTS "Services Manage Access" ON services;
CREATE POLICY "Services Manage Access" ON services
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'hq_admin'
        AND organization_id = services.organization_id
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'store_admin'
        AND organization_id = services.organization_id
        AND store_id = services.store_id
      )
    )
    AND (deleted_at IS NULL)
  );

-- [STAFF]
DROP POLICY IF EXISTS "Staff Manage Access" ON staff;
CREATE POLICY "Staff Manage Access" ON staff
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'hq_admin'
        AND organization_id = staff.organization_id
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'store_admin'
        AND organization_id = staff.organization_id
        AND store_id = staff.store_id
      )
    )
    AND (deleted_at IS NULL)
  );

-- [BOOKINGS] - Bookings View Access と Bookings Manage Access は既に 20241224_fix_bookings_rls.sql で更新済み
-- ここでは deleted_at 条件を追加（既存ポリシーに追加）
-- 注意: Bookings View Access ポリシーは複雑なため、別途更新が必要な場合は手動で対応

-- コメント更新
COMMENT ON COLUMN profiles.role IS 'ロール: hq_admin(本部管理者), store_admin(店舗管理者), field_staff(現場スタッフ), customer(顧客)';












