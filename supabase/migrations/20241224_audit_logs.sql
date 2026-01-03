-- Phase 2-2: 監査ログテーブル作成
-- 予約作成・変更・キャンセルを記録

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'booking.created', 'booking.updated', 'booking.cancelled', 'booking.failed'
  entity_type TEXT NOT NULL, -- 'booking'
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_store ON audit_logs(organization_id, store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation_type);

-- RLS有効化
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 組織内のユーザーのみ閲覧可能
DROP POLICY IF EXISTS "Audit logs access" ON audit_logs;
CREATE POLICY "Audit logs access" ON audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- コメント
COMMENT ON TABLE audit_logs IS '監査ログ: 予約作成・変更・キャンセルを記録';
COMMENT ON COLUMN audit_logs.operation_type IS '操作タイプ: booking.created, booking.updated, booking.cancelled, booking.failed';
COMMENT ON COLUMN audit_logs.metadata IS 'メタデータ: 変更前後の値、理由など';












