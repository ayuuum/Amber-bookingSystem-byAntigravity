/**
 * 環境変数の詳細確認スクリプト
 * 実行方法: npx tsx check_env_detailed.ts
 */

const requiredEnvVars = {
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL': { required: true, type: 'url' },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': { required: true, type: 'string', minLength: 50 },
  'SUPABASE_SERVICE_ROLE_KEY': { required: true, type: 'string', minLength: 50 },
  
  // Stripe
  'STRIPE_SECRET_KEY': { required: true, type: 'string', startsWith: 'sk_' },
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': { required: true, type: 'string', startsWith: 'pk_' },
  'STRIPE_WEBHOOK_SECRET': { required: false, type: 'string' },
  
  // Application
  'NEXT_PUBLIC_APP_URL': { required: true, type: 'url' },
  'NODE_ENV': { required: false, type: 'enum', values: ['development', 'production', 'test'] },
  
  // Optional
  'LINE_CHANNEL_ACCESS_TOKEN': { required: false, type: 'string' },
  'LINE_CHANNEL_SECRET': { required: false, type: 'string' },
  'GOOGLE_CLIENT_ID': { required: false, type: 'string' },
  'GOOGLE_CLIENT_SECRET': { required: false, type: 'string' },
  'LOG_LEVEL': { required: false, type: 'enum', values: ['error', 'warn', 'info', 'debug'] },
  'CRON_SECRET': { required: false, type: 'string' },
};

function checkEnvVar(key: string, config: any): { status: 'ok' | 'missing' | 'invalid', message: string } {
  const value = process.env[key];
  
  if (!value) {
    if (config.required) {
      return { status: 'missing', message: '❌ 未設定（必須）' };
    }
    return { status: 'ok', message: '⚪ 未設定（オプション）' };
  }
  
  // URLチェック
  if (config.type === 'url') {
    try {
      new URL(value);
    } catch {
      return { status: 'invalid', message: '❌ 無効なURL形式' };
    }
  }
  
  // 最小長チェック
  if (config.minLength && value.length < config.minLength) {
    return { status: 'invalid', message: `❌ 長さが不足（最小${config.minLength}文字、現在${value.length}文字）` };
  }
  
  // プレフィックスチェック
  if (config.startsWith && !value.startsWith(config.startsWith)) {
    return { status: 'invalid', message: `❌ プレフィックスが不正（${config.startsWith}で始まる必要があります）` };
  }
  
  // 列挙型チェック
  if (config.type === 'enum' && config.values && !config.values.includes(value)) {
    return { status: 'invalid', message: `❌ 無効な値（許可値: ${config.values.join(', ')}）` };
  }
  
  // 値の一部を表示（セキュリティのため）
  const displayValue = value.length > 30 
    ? `${value.substring(0, 20)}... (${value.length}文字)`
    : `${value.substring(0, 10)}... (${value.length}文字)`;
  
  return { status: 'ok', message: `✅ 設定済み: ${displayValue}` };
}

console.log('='.repeat(60));
console.log('環境変数の確認');
console.log('='.repeat(60));
console.log('');

let hasErrors = false;

for (const [key, config] of Object.entries(requiredEnvVars)) {
  const result = checkEnvVar(key, config);
  const requiredMark = config.required ? ' [必須]' : ' [オプション]';
  
  console.log(`${key}${requiredMark}`);
  console.log(`  ${result.message}`);
  
  if (result.status === 'missing' || result.status === 'invalid') {
    hasErrors = true;
  }
  console.log('');
}

console.log('='.repeat(60));
if (hasErrors) {
  console.log('❌ エラー: 一部の環境変数が正しく設定されていません');
  console.log('   .env.local ファイルを確認してください');
  process.exit(1);
} else {
  console.log('✅ すべての環境変数が正しく設定されています');
  process.exit(0);
}


