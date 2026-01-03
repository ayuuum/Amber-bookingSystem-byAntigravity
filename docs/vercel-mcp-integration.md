# VercelとMCP連携ガイド

このドキュメントでは、Vercelの環境変数とMCP（Model Context Protocol）サーバーを連携させる方法を説明します。

## 概要

MCPサーバーはCursorエディタ内でSupabaseデータベースにアクセスするためのツールです。Vercelの環境変数と同じ値を使用することで、開発環境と本番環境で一貫した設定を維持できます。

## 設定方法

### 1. MCP設定ファイルの作成

プロジェクトルートに `.cursor/mcp.json` ファイルを作成します：

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

### 2. 環境変数の設定

#### ローカル開発環境

**方法1: .env.local ファイルを使用（推奨）**

1. `.env.local.example` をコピーして `.env.local` を作成：
   ```bash
   cp .env.local.example .env.local
   ```

2. `.env.local` を編集して実際の値を設定：
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. 環境変数の検証：
   ```bash
   ./scripts/check-mcp-env.sh
   ```

**方法2: シェルの環境変数として設定**

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

> **注意**: MCP設定ファイル（`.cursor/mcp.json`）は `${NEXT_PUBLIC_SUPABASE_URL}` という形式で環境変数を参照します。Cursorが起動する際に、これらの環境変数がシェルの環境変数として設定されている必要があります。
>
> `.env.local` ファイルを使用する場合、Cursorを起動する前に環境変数を読み込む必要があります：
> ```bash
> # .env.localから環境変数を読み込む
> export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
> # その後、Cursorを起動
> ```
>
> または、`./scripts/check-mcp-env.sh` スクリプトを使用すると、自動的に `.env.local` から環境変数を読み込みます。

#### Vercel環境

Vercelのダッシュボードで以下の環境変数を設定します：

1. Vercel Dashboard (https://vercel.com) にアクセス
2. プロジェクトを選択
3. **Settings** > **Environment Variables** に移動
4. 以下の環境変数を追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | SupabaseのService Role Key | Production, Preview, Development |

> ⚠️ **重要**: `SUPABASE_SERVICE_ROLE_KEY` は機密情報です。Vercelの環境変数設定で適切に保護されていることを確認してください。

### 3. MCP設定ファイルの作成

**方法1: スクリプトを使用（推奨）**

```bash
# 環境変数が設定されている状態で実行
./scripts/setup-mcp.sh
```

**方法2: テンプレートからコピー**

```bash
# .cursor/mcp.json.example をコピー
cp .cursor/mcp.json.example .cursor/mcp.json
```

### 4. 環境変数の検証

MCPサーバーに必要な環境変数が正しく設定されているか確認：

```bash
./scripts/check-mcp-env.sh
```

このスクリプトは以下を確認します：
- `.env.local` ファイルの存在と読み込み
- 必須環境変数（`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`）の設定
- MCP設定ファイル（`.cursor/mcp.json`）の存在

### 5. MCPサーバーの起動確認

Cursorを再起動すると、MCPサーバーが自動的に起動します。以下のコマンドで手動確認も可能です：

```bash
# 環境変数を確認（.env.localから読み込む場合）
export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# MCPサーバーを手動でテスト
npx -y @quegenx/supabase-mcp-server
```

## Vercel環境変数との同期

### 環境変数の取得方法

#### Supabase URLとService Role Key

1. Supabase Dashboard (https://app.supabase.com) にアクセス
2. プロジェクトを選択
3. **Settings** > **API** に移動
4. 以下の情報をコピー：
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL` に設定
   - **service_role** キー: `SUPABASE_SERVICE_ROLE_KEY` に設定

### Vercel CLIを使用した環境変数の設定

Vercel CLIを使用して環境変数を設定することもできます：

```bash
# 1. Vercelにログイン
npx vercel login

# 2. プロジェクトをリンク（初回のみ）
npx vercel link

# 3. 環境変数を設定（対話形式）
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
# プロンプトが表示されたら:
#   - Environment: Production, Preview, Development を選択（通常はすべて選択）
#   - Value: SupabaseプロジェクトのURLを入力

npx vercel env add SUPABASE_SERVICE_ROLE_KEY
# プロンプトが表示されたら:
#   - Environment: Production, Preview, Development を選択
#   - Value: SupabaseのService Role Keyを入力

# 4. 環境変数を確認
npx vercel env ls

# 5. 環境変数を削除する場合
npx vercel env rm NEXT_PUBLIC_SUPABASE_URL
```

**対話的な設定例：**

```bash
$ npx vercel env add NEXT_PUBLIC_SUPABASE_URL
? What’s the value of NEXT_PUBLIC_SUPABASE_URL? https://your-project.supabase.co
? Add NEXT_PUBLIC_SUPABASE_URL to which Environments (select multiple)? 
  Production
  Preview
  Development
```

> **重要**: 環境変数を追加・変更した後は、再デプロイが必要です：
> ```bash
> npx vercel deploy --prod
> ```

## 連携の確認

### 1. MCPサーバーの接続確認

CursorエディタでMCPサーバーが接続されているか確認：

- Cursorの設定でMCPサーバーの状態を確認
- MCPツールが利用可能か確認（例: `mcp_supabase_list_tables`）

### 2. Vercelデプロイの確認

Vercelにデプロイ後、環境変数が正しく設定されているか確認：

```bash
# デプロイログを確認
npx vercel logs

# 環境変数の確認（APIエンドポイント経由）
curl https://your-domain.vercel.app/api/test/env-check
```

## トラブルシューティング

### MCPサーバーが接続されない

1. **環境変数の確認**
   ```bash
   # 環境変数検証スクリプトを実行
   ./scripts/check-mcp-env.sh
   
   # または手動で確認
   env | grep SUPABASE
   ```

2. **.env.local からの環境変数読み込み**
   - Cursorは `.env.local` を自動的に読み込みません
   - 環境変数をシェルの環境変数として設定する必要があります
   ```bash
   # .env.localから環境変数を読み込む
   export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
   # その後、Cursorを起動
   ```
   
   **永続的に設定する場合（推奨）:**
   ```bash
   # ~/.zshrc または ~/.bashrc に追加
   if [ -f .env.local ]; then
       export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
   fi
   ```

3. **Cursorの再起動**
   - Cursorを完全に終了して再起動
   - 環境変数の変更はCursor再起動後に反映されます

4. **MCP設定ファイルの確認**
   - `.cursor/mcp.json` が正しい形式か確認
   - JSONの構文エラーがないか確認
   ```bash
   # JSONの構文チェック
   cat .cursor/mcp.json | python3 -m json.tool
   ```

### Vercelで環境変数が読み込まれない

1. **環境変数のスコープ確認**
   - Production, Preview, Development のすべての環境で設定されているか確認

2. **再デプロイ**
   - 環境変数を追加・変更した後は再デプロイが必要です
   ```bash
   npx vercel deploy --prod
   ```

3. **ビルドログの確認**
   - Vercelのデプロイログで環境変数関連のエラーを確認

### 権限エラーが発生する場合

1. **Service Role Keyの確認**
   - Supabase Dashboardで正しいキーを取得しているか確認
   - キーが有効期限内か確認

2. **RLSポリシーの確認**
   - Service Role KeyはRLSをバイパスしますが、テーブルへのアクセス権限は必要です
   - Supabase Dashboardでテーブルの権限を確認

## ベストプラクティス

1. **環境変数の管理**
   - ローカル開発環境では `.env.local` を使用
   - Vercelでは環境変数設定を使用
   - 機密情報はGitにコミットしない

2. **環境の分離**
   - 開発環境と本番環境で異なるSupabaseプロジェクトを使用することを推奨
   - 環境ごとに適切な環境変数を設定

3. **セキュリティ**
   - Service Role Keyは機密情報として扱う
   - Vercelの環境変数設定で適切に保護
   - 定期的にキーをローテーション

## 便利なスクリプト

### 環境変数検証スクリプト

```bash
./scripts/check-mcp-env.sh
```

このスクリプトは以下を実行します：
- `.env.local` ファイルの読み込み
- 必須環境変数の確認
- MCP設定ファイルの存在確認

### MCP設定ファイル作成スクリプト

```bash
./scripts/setup-mcp.sh
```

このスクリプトは以下を実行します：
- 環境変数の確認
- `.cursor/mcp.json` の自動作成

## 関連ドキュメント

- [Vercel Deployment Guide](../deployment_guide.md)
- [MCP Setup Guide](../.cursor/mcp-setup.md)
- [Environment Variables](../src/lib/env.ts)


