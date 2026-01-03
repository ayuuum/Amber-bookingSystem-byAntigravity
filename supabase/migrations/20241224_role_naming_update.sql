-- Phase 2-1: ロール名の統一
-- org_admin → hq_admin, store_manager → store_admin, staff → field_staff

-- 1. 既存データの更新
UPDATE profiles 
SET role = 'hq_admin' 
WHERE role = 'org_admin' OR role = 'super_admin';

UPDATE profiles 
SET role = 'store_admin' 
WHERE role = 'store_manager';

UPDATE profiles 
SET role = 'field_staff' 
WHERE role = 'staff';

-- 2. CHECK制約の更新
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('hq_admin', 'store_admin', 'field_staff', 'customer'));

-- 3. コメント追加
COMMENT ON COLUMN profiles.role IS 'ロール: hq_admin(本部管理者), store_admin(店舗管理者), field_staff(現場スタッフ), customer(顧客)';












