# オンボーディング機能実装計画

## 概要

新規事業者のオンボーディングを改善するため、以下の4つの機能を実装します：

1. **新規登録（サインアップ）UI**
2. **オンボーディングウィザード**
3. **プラン選択UI**
4. **招待メール送信機能**

---

## 1. 新規登録（サインアップ）UI

### 実装内容

#### 1.1 サインアップページ (`/signup`)

**ファイル**: `src/app/signup/page.tsx`

**機能**:
- Email、Password、組織名、組織スラッグの入力フォーム
- バリデーション（Email形式、Password強度、スラッグの一意性）
- エラーハンドリング
- ログインページへのリンク

**UI要素**:
- カード形式のフォーム
- 白黒テーマに統一
- ローディング状態の表示

#### 1.2 組織作成API

**ファイル**: `src/app/api/auth/signup/route.ts`

**機能**:
1. Supabase Authでユーザー作成
2. 組織（Organization）の作成
   - 組織名、スラッグを保存
   - デフォルトプラン（`starter`）を設定
3. プロフィール（Profile）の作成
   - `role = 'org_admin'` を設定
   - `organization_id` を紐付け
4. 初期店舗の作成（オプション）
   - 組織名と同じ名前で店舗を作成

**エラーハンドリング**:
- スラッグの重複チェック
- トランザクション処理（失敗時はロールバック）

#### 1.3 ログインページの更新

**ファイル**: `src/app/login/page.tsx`

**変更内容**:
- 「新規登録はこちら」リンクを追加
- `/signup` へのリンク

---

## 2. オンボーディングウィザード

### 実装内容

#### 2.1 オンボーディングチェックAPI

**ファイル**: `src/app/api/onboarding/status/route.ts`

**機能**:
- 初回ログイン時に未完了の設定をチェック
- 完了状況を返却

**チェック項目**:
- [ ] 組織情報の設定（組織名、スラッグ）
- [ ] Stripe Connect連携
- [ ] プラン選択
- [ ] 店舗作成
- [ ] サービス登録
- [ ] スタッフ登録

#### 2.2 オンボーディングウィザードコンポーネント

**ファイル**: `src/components/onboarding/OnboardingWizard.tsx`

**機能**:
- ステップバイステップの設定ガイド
- 進捗状況の表示
- 各ステップへのリンク
- 「後で設定する」オプション

**ステップ**:
1. **組織情報の設定**
   - 組織名、スラッグの確認・編集
   - `/admin/settings` へのリンク

2. **プラン選択**
   - プラン比較表示
   - プラン選択
   - `/admin/plan` へのリンク

3. **Stripe Connect連携**
   - 決済基盤の説明
   - 連携ボタン
   - `/admin/settings` へのリンク

4. **店舗作成**
   - 店舗情報の入力
   - `/admin/stores` へのリンク

5. **サービス登録**
   - サービスの追加
   - `/admin/services` へのリンク

6. **スタッフ登録**
   - スタッフの追加
   - `/admin/staff` へのリンク

#### 2.3 管理画面レイアウトの更新

**ファイル**: `src/app/admin/layout.tsx`

**変更内容**:
- 初回ログイン時にオンボーディングウィザードを表示
- 未完了の設定がある場合、ダッシュボードにバナーを表示

---

## 3. プラン選択UI

### 実装内容

#### 3.1 プラン選択ページ

**ファイル**: `src/app/admin/plan/page.tsx`

**機能**:
- プラン比較表の表示
- 現在のプランの表示
- プラン変更機能
- プラン制限の表示

**UI要素**:
- 3つのプランカード（Starter, Growth, Enterprise）
- 機能比較表
- 「このプランを選択」ボタン
- 現在のプランのハイライト

#### 3.2 プラン変更API

**ファイル**: `src/app/api/admin/plan/change/route.ts`

**機能**:
- プランタイプの変更
- プラン制限値の更新
- Stripe Subscriptionの作成（Growth/Enterpriseの場合）
- エラーハンドリング（ダウングレード時の警告）

**リクエスト**:
```json
{
  "planType": "growth" | "enterprise"
}
```

**レスポンス**:
```json
{
  "success": true,
  "planType": "growth",
  "limits": {
    "stores": 3,
    "staff": 999,
    "houseAssets": 500
  }
}
```

#### 3.3 プラン制限表示コンポーネント

**ファイル**: `src/components/admin/PlanLimits.tsx`

**機能**:
- 現在のプラン制限の表示
- 使用状況のプログレスバー
- 上限到達時の警告

---

## 4. 招待メール送信機能

### 実装内容

#### 4.1 招待API

**ファイル**: `src/app/api/admin/invite/route.ts`

**機能**:
1. 招待メールの送信
   - Email、役割（`store_manager`）、店舗IDを指定
   - 招待トークンの生成
   - メール送信（Supabase Authの招待機能または自前実装）

2. 招待トークンの保存
   - `invitations` テーブルに保存
   - 有効期限（7日間）を設定

**リクエスト**:
```json
{
  "email": "store-manager@example.com",
  "role": "store_manager",
  "storeId": "uuid",
  "organizationId": "uuid"
}
```

#### 4.2 招待受諾ページ

**ファイル**: `src/app/invite/[token]/page.tsx`

**機能**:
- 招待トークンの検証
- パスワード設定フォーム
- アカウント作成とプロフィール設定
- ログイン後のリダイレクト

#### 4.3 招待管理ページ

**ファイル**: `src/app/admin/invites/page.tsx`

**機能**:
- 送信済み招待の一覧表示
- 招待の再送信
- 招待の取り消し
- 招待ステータス（未承認、承認済み、期限切れ）の表示

#### 4.4 メール送信機能

**オプション1: Supabase Authの招待機能を使用**
- `supabase.auth.admin.inviteUserByEmail()` を使用
- カスタムメールテンプレートの設定

**オプション2: 自前実装（Resend等）**
- Resend、SendGrid等のメールサービスを使用
- カスタムメールテンプレート

**推奨**: Phase 1.1では、Supabase Authの招待機能を使用（シンプル）

#### 4.5 データベーススキーマ

**マイグレーション**: `supabase/migrations/20241225_invitations.sql`

```sql
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('store_manager', 'staff')),
  invited_by uuid REFERENCES auth.users(id),
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
```

---

## 実装順序

### Phase 1: 基本機能（優先度: 高）

1. **新規登録（サインアップ）UI** ✅
   - サインアップページ
   - 組織作成API
   - ログインページの更新

2. **オンボーディングウィザード（基本版）** ✅
   - オンボーディングチェックAPI
   - シンプルなチェックリスト表示
   - 各設定ページへのリンク

### Phase 2: プラン管理（優先度: 中）

3. **プラン選択UI** ✅
   - プラン選択ページ
   - プラン変更API
   - プラン制限表示コンポーネント

### Phase 3: 招待機能（優先度: 中）

4. **招待メール送信機能** ✅
   - 招待API
   - 招待受諾ページ
   - 招待管理ページ
   - メール送信機能

---

## 技術的な考慮事項

### セキュリティ

- スラッグの一意性チェック（SQL制約 + アプリケーション層）
- 招待トークンの暗号化
- 招待トークンの有効期限管理
- RLSポリシーの適用

### パフォーマンス

- オンボーディングチェックのキャッシュ
- プラン制限の事前計算

### UX

- ローディング状態の表示
- エラーメッセージの日本語化
- 進捗状況の視覚的表示
- 「後で設定する」オプション

---

## 参考資料

- [PRD - 料金プラン](./prd.md#6-料金プラン--機能制限pricing-plans--limits)
- [オンボーディングフロー](./onboarding_flow.md)
- [ユーザージャーニー](./user_journey.md)




