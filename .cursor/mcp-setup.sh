#!/bin/bash
# Supabase MCPサーバー設定スクリプト
# このスクリプトを実行して環境変数を設定してください

echo "Supabase MCPサーバー設定"
echo "========================"
echo ""

# 環境変数の確認
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️ 環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません"
    echo ""
    echo "設定方法:"
    echo "1. Supabase Dashboard (https://app.supabase.com) にアクセス"
    echo "2. プロジェクトを選択"
    echo "3. Settings > API に移動"
    echo "4. 'service_role' キーをコピー"
    echo ""
    echo "以下のコマンドを実行してください:"
    echo "export SUPABASE_SERVICE_ROLE_KEY=\"your-service-role-key-here\""
    echo ""
    echo "永続的に設定するには、~/.zshrc または ~/.bashrc に追加してください:"
    echo "echo 'export SUPABASE_SERVICE_ROLE_KEY=\"your-key\"' >> ~/.zshrc"
    echo ""
else
    echo "✅ 環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されています"
    echo ""
fi

echo "現在のSupabase URL: https://bnsancyvflsdeqtnydpo.supabase.co"
echo ""
echo "MCPサーバーのテスト:"
echo "npx -y @quegenx/supabase-mcp-server"
echo ""














