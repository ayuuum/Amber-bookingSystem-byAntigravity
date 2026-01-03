# イベントシステム設定ガイド

## 概要

イベント駆動アーキテクチャの設定と運用方法を説明します。

## 1. 環境変数の設定

### USE_EVENT_SYSTEM

イベント駆動アーキテクチャを有効化するかどうかを制御します。

```bash
# .env.local または環境変数設定
USE_EVENT_SYSTEM=true  # イベント駆動を有効化
USE_EVENT_SYSTEM=false # 既存の同期処理を使用（デフォルト）
```

**デフォルト動作**: `false`（既存の同期処理を使用）

**推奨**: まずは `false` のまま動作確認し、問題なければ `true` に切り替えてください。

### CRON_SECRET

Cronジョブの認証用シークレット（オプション）

```bash
CRON_SECRET=your-secret-key-here
```

## 2. Cronジョブの設定

### Vercelの場合

`vercel.json` に以下を追加：

```json
{
  "crons": [
    {
      "path": "/api/cron/process-events",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

または、Vercelダッシュボードから設定：
1. プロジェクト設定 → Cron Jobs
2. 新しいCronジョブを追加
3. Path: `/api/cron/process-events`
4. Schedule: `*/1 * * * *` (1分ごと)

### その他のホスティングサービスの場合

外部Cronサービス（例: cron-job.org、EasyCron）を使用：

- URL: `https://your-domain.com/api/cron/process-events`
- Method: GET
- Headers: `Authorization: Bearer ${CRON_SECRET}` (CRON_SECRETを設定している場合)
- Schedule: 1分ごと

## 3. マイグレーションの適用

マイグレーションは既に適用済みです。以下のテーブルが作成されています：

- `system_events`: イベントキュー
- `event_observations`: イベント観察記録
- `failed_events_for_dlq`: DLQビュー

## 4. 動作確認

### 4.1 イベント駆動を有効化

1. 環境変数 `USE_EVENT_SYSTEM=true` を設定
2. 予約を作成
3. 管理画面の「イベント監視」ページ（`/admin/events`）でイベントが発行されているか確認

### 4.2 イベント処理の確認

1. `/api/events/process` エンドポイントを手動で呼び出し（POST）
2. または、Cronジョブが自動実行されるのを待つ
3. 管理画面でイベントの状態が `completed` になっているか確認

### 4.3 DLQの確認

1. 意図的に外部APIを失敗させる（例: LINE APIのトークンを無効化）
2. 最大再試行回数（デフォルト3回）を超えるとDLQへ移動
3. 管理画面の「Dead Letter Queue」タブで確認

## 5. トラブルシューティング

### イベントが処理されない

1. Cronジョブが正しく設定されているか確認
2. `/api/cron/process-events` を手動で呼び出してエラーがないか確認
3. ログを確認（Vercel Logs、またはアプリケーションログ）

### DLQにイベントが蓄積する

1. 管理画面でエラータイプを確認
2. 外部API（LINE、Google Calendar）の認証情報を確認
3. 必要に応じてDLQから再試行または削除

### パフォーマンスの問題

1. イベント処理のバッチサイズを調整（`/api/events/process` の `limit` パラメータ）
2. Cronジョブの実行頻度を調整（1分 → 30秒など）
3. 古いイベントをアーカイブ（90日以上経過したイベント）

## 6. ロールバック方法

問題が発生した場合、以下の手順でロールバック：

1. 環境変数 `USE_EVENT_SYSTEM=false` に設定
2. 既存の同期処理が再開される
3. イベントテーブルのデータは残るが、処理は停止

## 7. 監視とアラート

### 推奨監視項目

- 未処理イベント数（`pending` 状態）が100件以上
- DLQ内イベント数が10件以上
- イベント処理の成功率が95%以下

### アラート設定例

```typescript
// カスタムアラートロジック（実装例）
if (pendingCount > 100) {
  // Slack通知、メール通知など
}
```

## 8. 次のステップ

- [ ] 環境変数 `USE_EVENT_SYSTEM` の設定
- [ ] Cronジョブの設定
- [ ] 動作確認
- [ ] 監視とアラートの設定
- [ ] 本番環境での段階的ロールアウト


