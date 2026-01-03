# Vercel Deployment Guide

Amber プロジェクトの Vercel へのデプロイ準備が整いました。ローカルビルドにて全ての型エラーが解消され、正常にビルドできることを確認済みです。

## 1. 必要な環境変数
Vercel のプロジェクト設定 (Settings > Environment Variables) で以下の値を設定してください。
`.env.local.example` を参考に、実際の値を入力してください。

| 変数名 | 説明 |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトの URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の Service Role Key (サーバー側用) |
| `STRIPE_SECRET_KEY` | Stripe のシークレットキー |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook のシークレットキー |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API のアクセストークン |
| `LINE_CHANNEL_SECRET` | LINE Messaging API のチャネルシークレット |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `GOOGLE_REDIRECT_URI` | `https://your-domain.vercel.app/api/auth/google/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` |

> [!IMPORTANT]
> ビルド時、Next.js 15 の制約により、Stripe 等のモジュールが環境変数が未設定だとエラーを出す場合があります。デプロイ前に必ず Vercel 上で環境変数を設定してください。

## 2. デプロイコマンド
ターミナルでプロジェクトのルートディレクトリに移動し、以下のコマンドを実行してください。

```bash
# Vercel にログイン (未ログインの場合)
npx vercel login

# プロジェクトをリンクしてデプロイ
npx vercel link
npx vercel deploy --prod
```

## 3. 完了後の確認
デプロイが完了したら、以下の URL にアクセスして動作を確認してください。
- `https://your-domain.vercel.app/` (HP)
- `https://your-domain.vercel.app/login` (Admin/HQ ログイン)
- `https://your-domain.vercel.app/book/amber/main` (予約フォーム例)

## 4. MCPサーバーとの連携

Vercelの環境変数は、ローカル開発環境のMCPサーバーでも使用できます。

### 環境変数の検証

ローカル環境で環境変数が正しく設定されているか確認：

```bash
./scripts/check-mcp-env.sh
```

### MCP設定ファイルの作成

**方法1: スクリプトを使用（推奨）**

```bash
./scripts/setup-mcp.sh
```

**方法2: テンプレートからコピー**

```bash
cp .cursor/mcp.json.example .cursor/mcp.json
```

### MCP設定ファイルの内容

`.cursor/mcp.json` ファイルは以下の形式です：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@quegenx/supabase-mcp-server"
      ],
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

> **注意**: `.cursor/mcp.json` は個人設定ファイルのため、`.gitignore` に含まれています。各開発者が個別に作成する必要があります。

詳細については、[VercelとMCP連携ガイド](./docs/vercel-mcp-integration.md) を参照してください。

## 実施した修正
- **型エラーの解消**: `tsc` で検出された全ての不整合（予約スキーマのフィールド名、未使用のインポート等）を修正しました。
- **ビルド確認**: ローカル環境にて `npm run build` が正常に完了することを確認しました。
- **スキーマの統一**: 予約フォームと API 間で利用される `lastName`, `firstName`, `address`, `phone` などのフィールド名を完全に一致させました。
