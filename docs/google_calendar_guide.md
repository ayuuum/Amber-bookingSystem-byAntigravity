# Google Calendar 連携ガイド

本システムで Google Calendar の空き状況連携機能を使用するための設定手順です。

## 概要
Google Calendar API を使用して、事業者のカレンダーから「予定あり（Busy）」の時間帯を取得し、システム上の予約可能枠から除外します。

## 1. Google Cloud Console 設定 (管理者向け)
本システムの管理者が行う初期設定です。

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、プロジェクトを作成（または選択）します。
2. **API とサービス > ライブラリ** から **Google Calendar API** を検索し、「有効にする」をクリックします。
3. **API とサービス > OAuth 同意画面** で、以下を設定します。
   - User Type: 外部 (External)
   - スコープ: `.../auth/calendar.readonly` または `.../auth/calendar`
   - テストユーザー: 開発中はテストに使用する Google アカウントを追加
4. **API とサービス > 認証情報** で **OAuth クライアント ID** を作成します。
   - アプリケーションの種類: Web アプリケーション
   - 承認済みのリダイレクト URI: `https://<YOUR_SUPABASE_PROJECT>.supabase.co/auth/v1/callback`
5. 作成後、**クライアント ID** と **クライアント シークレット** を取得します。

## 2. Supabase 環境変数設定 (管理者向け)
取得したキーを Supabase Edge Functions の環境変数に設定します。

```bash
supabase py env set GOOGLE_CLIENT_ID=xxxxxx
supabase py env set GOOGLE_CLIENT_SECRET=xxxxxx
# または Supabase Dashboard の Settings > Edge Functions から設定
```

## 3. 事業者（ユーザー）の連携手順
**「ワンクリック連携」機能が実装されました。**

1. 管理画面にログインし、**「プロフィール設定」** ページを開きます。
2. 画面下部の「外部サービス連携」カードにある **「連携する」** ボタンをクリックします。
3. Google の認証画面が開くので、連携したいアカウントでログインし、アクセスを許可します。
4. 自動的にプロフィールページに戻り、「連携済み」と表示されれば完了です。

### 連携の確認
連携が完了すると、自動的に予約システムがあなたのGoogleカレンダーの「予定あり」時間を参照し、その時間帯への予約をブロックします。

## トラブルシューティング
- **連携ボタンがエラーになる**: 管理者が Supabase Edge Functions の環境変数 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) を正しく設定しているか確認してください。
- **リダイレクトエラー**: Google Cloud Console の「承認済みのリダイレクト URI」に `https://<YOUR_PROJECT>.supabase.co/functions/v1/google-calendar-auth` ではなく、**`https://<YOUR_APP_DOMAIN>/google-callback`** が設定されているか確認してください（※実装により異なりますが、今回の実装ではフロントエンドのリダイレクトURLを使用しています）。
  - **重要**: 本システムの実装では、認証後のリダイレクト先はフロントエンドのページ (`/google-callback`) です。開発環境の場合は `http://localhost:8080/google-callback` も許可リストに追加してください。
