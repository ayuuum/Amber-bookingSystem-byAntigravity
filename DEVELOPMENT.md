# 技術詳細ガイド (Development Deep Dive)

このガイドでは、Amber プラットフォームの開発に携わるエンジニアや AI エージェント向けに、技術的な詳細を提供します。

## 🏗️ アーキテクチャ概要

Amber は、サーバーレス・アーキテクチャ上に構築されたマルチテナント SaaS です。

### データの隔離 (RLS)
Supabase の **Row Level Security (RLS)** を使用して、マルチテナントを実現しています。
- ほとんどのテーブルは `organization_id` または `store_id` にスコープされています。
- フロントエンドからのクエリは、必ずこれらの境界を尊重する必要があります。
- **セキュリティルール**: 公開エンドポイントを除き、RLS を無効にしないでください。

### 認証 ＆ ロール
- **認証**: Supabase Auth (JWT)。
- **ロール**: `user_roles` テーブルで定義されます (`super_admin`, `store_admin`, `staff`)。
- **認可**: ロジックは RLS ポリシーとアプリケーション層のチェックに分散されています。

## 🔗 外部連携

### Stripe Connect
- **モデル**: Standard または Custom Connect (詳細は PRD 第 5 章参照)。
- **Webhook**: `/api/webhooks/stripe` で処理されます。
- **精算**: プラットフォーム手数料 (7%) の徴収が自動化されています。

### 6. 外部連携 (Integrations)
- **Stripe**: `/api/stripe` 経由で Connect アカウント作成、決済セッション管理を実施。
- **LINE**: `LINE_CHANNEL_ACCESS_TOKEN` を使用した通知プログラム。

---

## テスト環境 (Testing)

プロジェクトの品質維持のため、以下のテスト環境が構築されています。

### ユニットテスト (Vitest)
ロジックやコンポーネントの単体テスト。
```bash
npm test
```

### E2Eテスト (Playwright)
ブラウザ実機を用いたエンドツーエンドテスト。
```bash
npx playwright install # 初回のみ
npm run test:e2e
```

### テスト作成の指針
- **ロジック**: `src/**/*.test.ts` に作成。
- **UIコンポーネント**: `src/**/*.test.tsx` に作成。
- **シナリオ**: `e2e/**/*.spec.ts` に作成。
と `LINE_CHANNEL_SECRET` が必要です。

## 🗄️ データベース設計のヒント

### 「家カルテ」 (住宅設備管理)
- `house_assets` テーブルは、柔軟なデータ構造のために `JSONB` を使用しています。
- カテゴリ例: `hvac` (空調), `kitchen`, `water_system` (水回り) など。
- 共通フィールド: `manufacturer` (メーカー), `model_number` (型番), `installation_date` (設置日), `last_cleaned_at` (最終清掃日)。

### 予約の重複検知
- データベースレベルでダブルブッキングを防ぐために、PostgreSQL の `EXCLUDE` 制約と `tsrange` を使用しています。
- これが空き枠情報の「唯一の正解」となります。

## 🚀 環境変数

フル機能を利用するために必要な環境変数:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (サーバーサイドのみ)
- `STRIPE_SECRET_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`

## 🧪 テスト ＆ チェック
- **Lint**: `npm run lint`
- **ビルド**: `npm run build`
- **UI テスト**: Playwright/Cypress (開発中)

---
ビジネスロジックの詳細については [PRD](file:///Users/ayumu/Amber-House-PJ/docs/prd.md) を参照してください。
