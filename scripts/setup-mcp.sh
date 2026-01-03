#!/bin/bash
# MCP設定ファイル作成スクリプト
# Vercelの環境変数と連携するMCP設定ファイルを作成します

echo "MCP設定ファイル作成"
echo "==================="
echo ""

# .cursorディレクトリの確認
CURSOR_DIR=".cursor"
if [ ! -d "$CURSOR_DIR" ]; then
    echo "📁 .cursorディレクトリを作成します..."
    mkdir -p "$CURSOR_DIR"
fi

# MCP設定ファイルのパス
MCP_CONFIG="$CURSOR_DIR/mcp.json"

# 既存の設定ファイルがあるか確認
if [ -f "$MCP_CONFIG" ]; then
    echo "⚠️ 既存のMCP設定ファイルが見つかりました: $MCP_CONFIG"
    read -p "上書きしますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ キャンセルしました"
        exit 1
    fi
fi

# 環境変数の確認
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "⚠️ 環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません"
    echo ""
    echo "設定方法:"
    echo "1. .env.local ファイルに設定"
    echo "2. または環境変数として設定: export NEXT_PUBLIC_SUPABASE_URL=\"https://your-project.supabase.co\""
    echo ""
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ キャンセルしました"
        exit 1
    fi
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️ 環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません"
    echo ""
    echo "設定方法:"
    echo "1. Supabase Dashboard (https://app.supabase.com) にアクセス"
    echo "2. プロジェクトを選択"
    echo "3. Settings > API に移動"
    echo "4. 'service_role' キーをコピー"
    echo ""
    echo ".env.local ファイルに追加するか、環境変数として設定してください"
    echo ""
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ キャンセルしました"
        exit 1
    fi
fi

# MCP設定ファイルの作成
echo "📝 MCP設定ファイルを作成します: $MCP_CONFIG"
cat > "$MCP_CONFIG" << 'EOF'
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
EOF

echo "✅ MCP設定ファイルを作成しました: $MCP_CONFIG"
echo ""
echo "次のステップ:"
echo "1. Cursorを再起動してMCPサーバーを接続してください"
echo "2. 環境変数が正しく設定されているか確認してください:"
echo "   echo \$NEXT_PUBLIC_SUPABASE_URL"
echo "   echo \$SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "詳細は docs/vercel-mcp-integration.md を参照してください"


