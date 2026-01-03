-- Event System Migration
-- イベント駆動アーキテクチャの基盤となるテーブルを作成

-- 1. system_events テーブル（イベントキュー）
CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    queue_name TEXT NOT NULL DEFAULT 'main' CHECK (queue_name IN ('main', 'dlq')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    processed_at TIMESTAMP,
    error_message TEXT,
    error_type TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_system_events_queue_status_created 
    ON system_events(queue_name, status, created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_event_entity 
    ON system_events(event_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_events_status_retry 
    ON system_events(status, retry_count, max_retries);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at 
    ON system_events(created_at DESC);

-- 重複チェック用のユニーク制約（同じイベントの重複発行を防止）
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_events_unique_event 
    ON system_events(event_type, entity_id) 
    WHERE status IN ('pending', 'processing');

-- updated_at の自動更新トリガー
CREATE OR REPLACE FUNCTION update_system_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_events_updated_at
    BEFORE UPDATE ON system_events
    FOR EACH ROW
    EXECUTE FUNCTION update_system_events_updated_at();

-- 2. event_observations テーブル（イベント観察記録）
CREATE TABLE IF NOT EXISTS event_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES system_events(id) ON DELETE CASCADE,
    handler_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
    error_type TEXT,
    failure_point TEXT, -- 'LINE_API', 'GOOGLE_API', 'NETWORK', 'TIMEOUT' など
    duration_ms INTEGER,
    external_latencies JSONB DEFAULT '{}', -- 外部API別レイテンシー
    retry_count INTEGER NOT NULL DEFAULT 0,
    should_retry BOOLEAN,
    next_retry_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_event_observations_event_handler 
    ON event_observations(event_id, handler_name);
CREATE INDEX IF NOT EXISTS idx_event_observations_status_failure 
    ON event_observations(status, failure_point, created_at);
CREATE INDEX IF NOT EXISTS idx_event_observations_error_type 
    ON event_observations(error_type, created_at);
CREATE INDEX IF NOT EXISTS idx_event_observations_created_at 
    ON event_observations(created_at DESC);

-- 3. Dead Letter Queue ビュー
CREATE OR REPLACE VIEW failed_events_for_dlq AS
SELECT 
    se.*,
    COUNT(eo.id) as observation_count
FROM system_events se
LEFT JOIN event_observations eo ON se.id = eo.event_id
WHERE se.status = 'failed' 
  AND se.retry_count >= se.max_retries
  AND se.queue_name = 'main'
GROUP BY se.id;

-- 4. RLS (Row Level Security) ポリシー
-- system_events テーブル
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがイベントを読み取れる（監視用）
CREATE POLICY "Allow read system_events for authenticated users"
    ON system_events FOR SELECT
    TO authenticated
    USING (true);

-- サービスロールのみがイベントを挿入・更新できる
CREATE POLICY "Allow insert system_events for service role"
    ON system_events FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow update system_events for service role"
    ON system_events FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- event_observations テーブル
ALTER TABLE event_observations ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが観察記録を読み取れる（監視用）
CREATE POLICY "Allow read event_observations for authenticated users"
    ON event_observations FOR SELECT
    TO authenticated
    USING (true);

-- サービスロールのみが観察記録を挿入できる
CREATE POLICY "Allow insert event_observations for service role"
    ON event_observations FOR INSERT
    TO service_role
    WITH CHECK (true);

-- コメント
COMMENT ON TABLE system_events IS 'イベントキュー: 予約作成、決済完了などのイベントを非同期処理するためのキュー';
COMMENT ON TABLE event_observations IS 'イベント観察記録: イベント処理時の詳細な観察結果（成功/失敗、レイテンシー、エラータイプなど）';
COMMENT ON VIEW failed_events_for_dlq IS 'Dead Letter Queue: 最大再試行回数を超えた失敗イベント';

COMMENT ON COLUMN system_events.queue_name IS 'キュー名: main（通常キュー）または dlq（Dead Letter Queue）';
COMMENT ON COLUMN system_events.error_type IS 'エラータイプ: NETWORK_ERROR, TIMEOUT, AUTH_FAILED など';
COMMENT ON COLUMN event_observations.failure_point IS '失敗ポイント: LINE_API, GOOGLE_API, NETWORK, TIMEOUT など';
COMMENT ON COLUMN event_observations.external_latencies IS '外部API別レイテンシー: { lineApi: 1200, googleApi: 800 } など';


