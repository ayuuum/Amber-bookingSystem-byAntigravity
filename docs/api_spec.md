# Amber Technical & API Specifications（技術・外部連携仕様書）

> [!NOTE]
> 本ドキュメントは [PRD](file:///Users/ayumu/Amber-House-PJ/docs/prd.md) の「3. 機能要件」および「4. 外部連携」を技術的に詳細化するための補足資料である。
> 定義が矛盾する場合は、常に PRD の記述を優先する。

## 1. 概要（Overview）

本ドキュメントは、Amber の内部 API エンドポイント、データベース連携、および外部サービス（Stripe, LINE, Google）との統合仕様を定義する。

---

## 2. 内部 API エンドポイント（Internal APIs）

ベースURL: `/api`

### 2-1. 予約エンジン: 空き枠照会
- **エンドポイント**: `GET /availability`
- **概要**: 指定された条件（店舗、サービス、スタッフ）に基づき、最短・最長の所要時間を考慮した予約可能スロットを返す。
- **リクエストパラメータ**:
  - `store_id` (UUID): 必須
  - `service_ids` (UUID[]): 必須（複数選択による合計所要時間の算出用）
  - `staff_id` (UUID): 任意（指名ありの場合）
  - `date` (ISO-8601): 参照日
- **レスポンス**:
  ```json
  {
    "date": "2025-12-25",
    "slots": [
      { "time": "10:00", "available": true, "staff_count": 2 },
      { "time": "10:30", "available": false, "reason": "occupied" }
    ]
  }
  ```

### 2-2. 予約確定処理
- **エンドポイント**: `POST /bookings`
- **概要**: 予約データの作成。Stripe 事前決済（Phase 1.2）が必要な場合は、PaymentIntent のステータスと連動する。
- **セキュリティ**: 本部・店舗管理者（`Store Admin` 以上）または公開予約クライアントからのセキュアトークンが必要。

---

## 3. Stripe Connect 連携仕様（Fintech Integration）

### 3-1. 運用モデル
- **Connect Type**: `Standard` または `Custom` アカウント。
- **Transfer Method**: `Separate Charges and Transfers`。

### 3-2. 手数料分配ロジック (Fee Structure)
- **Amber 手数料**: 決済額（税込）の **7%**。
- **計算式**:
  - `Total Amount`: 11,000円
  - `Amber Fee (7%)`: 770円
  - `Transfer to Store`: 10,230円（Stripe 決済手数料を店舗負担にするかプラットフォーム負担にするかは契約による）

### 3-3. Webhook イベント
- `payment_intent.succeeded`: 予約ステータスを `confirmed` に更新。
- `transfer.created`: 加盟店への入金（分配）完了ログの作成。

---

## 4. LINE Messaging API 連携（Communication Loop）

### 4-1. 通知フロー
- **予約完了通知**: 顧客の LINE ユーザー ID と連携し、予約詳細カード（Flex Message）を送信。
- **リマインド通知**: 施工前日 10:00 に自動実行。
- **サンキューメッセージ ＆ レビュー依頼**: 完了ステータス更新後に自動送信。

### 4-2. LINE ログイン / LIFF
- 予約フォームを LIFF (LINE Front-end Framework) で提供し、顧客情報の自動取得と友だち追加を促進。

---

## 5. Google API 連携（Calendar & Map）

### 5-1. Google Calendar
- サービスアカウント（Phase 1.0）または個別 OAuth（Phase 1.1）を利用。
- **同期方向**: `Amber -> Google Calendar` (一方向)。スタッフの個人予定を Amber に反映させる場合は双方向。

---

## 6. セキュリティ ＆ 認証（Security & Auth）

### 6-1. Supabase Auth
- JWT を利用した認証。
- **RLS (Row Level Security)**: `auth.uid()` および `user_role` クレームに基づき、`organization_id` による完全なデータ分離を DB レベルで強制。

### 6-2. API レート制限
- 1 分間に 60 リクエスト（店舗側 API は 100 リクエスト）を基準値とする。

---

## 7. データの整合性 ＆ エラー処理

- **トランスアクション**: 予約確定と支払い完了の整合性を保つため、DB トランザクションまたはステータス履歴の追跡を行う。
- **エラーコード**:
  - `ERR_SLOT_TAKEN`: 計算中にスロットが埋まった。
  - `ERR_FEE_CALC_MISMATCH`: 手数料計算の不整合。
