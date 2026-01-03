#!/bin/bash
# MCP環境変数検証スクリプト
# MCPサーバーに必要な環境変数が正しく設定されているか確認します

echo "MCP環境変数検証"
echo "================"
echo ""

# カラー出力用の変数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラーカウント
ERROR_COUNT=0

# .env.localファイルから環境変数を読み込む
if [ -f .env.local ]; then
    echo "📄 .env.local ファイルを読み込み中..."
    # .env.localから環境変数をエクスポート（コメントと空行を除外）
    export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
    echo "✅ .env.local を読み込みました"
    echo ""
else
    echo "${YELLOW}⚠️  .env.local ファイルが見つかりません${NC}"
    echo "   環境変数はシェルの環境変数から読み込まれます"
    echo ""
fi

# 環境変数の確認
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo "${RED}❌ $var_name: 未設定${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
        return 1
    else
        # 機密情報は一部のみ表示
        if [[ "$var_name" == *"KEY"* ]] || [[ "$var_name" == *"SECRET"* ]] || [[ "$var_name" == *"TOKEN"* ]]; then
            local masked_value="${var_value:0:20}... (${#var_value}文字)"
            echo "${GREEN}✅ $var_name: 設定済み ($masked_value)${NC}"
        else
            echo "${GREEN}✅ $var_name: 設定済み ($var_value)${NC}"
        fi
        return 0
    fi
}

echo "🔍 環境変数の確認:"
echo ""

# MCPサーバーに必要な環境変数
check_env_var "NEXT_PUBLIC_SUPABASE_URL"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "📋 追加の環境変数（アプリケーション用）:"
echo ""

# アプリケーションに必要な環境変数（オプション）
check_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" || echo "${YELLOW}⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY: 未設定（オプション）${NC}"
check_env_var "STRIPE_SECRET_KEY" || echo "${YELLOW}⚠️  STRIPE_SECRET_KEY: 未設定（オプション）${NC}"
check_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" || echo "${YELLOW}⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 未設定（オプション）${NC}"
check_env_var "NEXT_PUBLIC_APP_URL" || echo "${YELLOW}⚠️  NEXT_PUBLIC_APP_URL: 未設定（オプション）${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    echo "${GREEN}✅ すべての必須環境変数が設定されています！${NC}"
    echo ""
    echo "次のステップ:"
    echo "1. Cursorを再起動してMCPサーバーを接続してください"
    echo "2. MCP設定ファイル (.cursor/mcp.json) が存在するか確認してください"
    echo ""
    if [ ! -f .cursor/mcp.json ]; then
        echo "${YELLOW}⚠️  .cursor/mcp.json が見つかりません${NC}"
        echo "   以下のコマンドで作成できます:"
        echo "   ./scripts/setup-mcp.sh"
        echo "   または .cursor/mcp.json.example をコピーしてください"
    else
        echo "${GREEN}✅ MCP設定ファイル (.cursor/mcp.json) が存在します${NC}"
    fi
    exit 0
else
    echo "${RED}❌ $ERROR_COUNT 個の必須環境変数が未設定です${NC}"
    echo ""
    echo "設定方法:"
    echo "1. .env.local.example をコピーして .env.local を作成"
    echo "   cp .env.local.example .env.local"
    echo ""
    echo "2. .env.local を編集して実際の値を設定"
    echo ""
    echo "3. または、環境変数として設定"
    echo "   export NEXT_PUBLIC_SUPABASE_URL=\"https://your-project.supabase.co\""
    echo "   export SUPABASE_SERVICE_ROLE_KEY=\"your-service-role-key\""
    echo ""
    echo "詳細は docs/vercel-mcp-integration.md を参照してください"
    exit 1
fi

