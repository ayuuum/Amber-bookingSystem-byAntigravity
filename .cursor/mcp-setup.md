# Supabase MCPサーバー設定ガイド

## 設定ファイルの場所
- グローバル設定: `~/.cursor/mcp.json`
- プロジェクト固有設定: `.cursor/mcp.json` (プロジェクトルート)

## 推奨設定

プロジェクトルートに `.cursor/mcp.json` ファイルを作成し、以下の設定を追加してください：

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

この設定により、Vercelの環境変数と同じ値を使用してMCPサーバーを起動できます。

## 必要な環境変数

MCPサーバーを動作させるには、以下の環境変数を設定する必要があります：

### ローカル開発環境

`.env.local` ファイルに設定：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

または、シェルの環境変数として設定：

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### Vercel環境

Vercelのダッシュボードで環境変数を設定してください。詳細は [VercelとMCP連携ガイド](../docs/vercel-mcp-integration.md) を参照してください。

### 環境変数の取得方法

1. Supabase Dashboard (https://app.supabase.com) にアクセス
2. プロジェクトを選択
3. Settings > API に移動
4. 以下の情報をコピー：
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL` に設定
   - **service_role** キー: `SUPABASE_SERVICE_ROLE_KEY` に設定（⚠️ 機密情報のため注意）

## 設定の確認

### 環境変数の検証

環境変数が正しく設定されているか確認：

```bash
./scripts/check-mcp-env.sh
```

### MCP設定ファイルの確認

```bash
# MCP設定ファイルが存在するか確認
ls -la .cursor/mcp.json

# JSONの構文チェック
cat .cursor/mcp.json | python3 -m json.tool
```

### Cursorの再起動

Cursorを再起動すると、MCPサーバーが自動的に接続されます。

> **重要**: `.env.local` ファイルを使用している場合、Cursorを起動する前に環境変数を読み込む必要があります：
> ```bash
> # .env.localから環境変数を読み込む
> export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
> # その後、Cursorを起動
> ```

手動で確認する場合：

```bash
# 環境変数の確認
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# MCPサーバーのテスト
npx -y @quegenx/supabase-mcp-server
```

## Vercelとの連携

Vercelの環境変数とMCPサーバーを連携させる方法については、[VercelとMCP連携ガイド](../docs/vercel-mcp-integration.md) を参照してください。

## トラブルシューティング

1. **環境変数が読み込まれない場合**
   - Cursorを再起動してください
   - 環境変数を `.zshrc` または `.bashrc` に追加してください
   - `.env.local` ファイルがプロジェクトルートに存在するか確認

2. **MCPサーバーが接続されない場合**
   - `npx @quegenx/supabase-mcp-server` を手動で実行してエラーを確認
   - Supabase URLとService Role Keyが正しいか確認
   - `.cursor/mcp.json` ファイルの形式が正しいか確認

3. **権限エラーが発生する場合**
   - Service Role Keyが正しく設定されているか確認
   - RLSポリシーが適切に設定されているか確認
   - Supabase Dashboardでキーが有効か確認

4. **Vercel環境変数との不一致**
   - Vercelの環境変数設定を確認
   - ローカルとVercelで同じSupabaseプロジェクトを使用しているか確認

