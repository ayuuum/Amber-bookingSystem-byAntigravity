# Amber - AI ネイティブ・フィールドサービス管理 (FSM) プラットフォーム

<div align="center">
  <img src="public/logo.png" alt="Amber Logo" width="200" />
  <p><strong>AI ネイティブな自動化と「家カルテ」CRM で住宅メンテナンス業界を革新する</strong></p>
</div>

---

## 🏗️ プロジェクト概要

Amber（アンバー）は、日本のハウスクリーニング・住宅メンテナンス業界向けに設計された AI ネイティブな垂直統合型 SaaS です。予約業務の自動化と、住宅設備の構造化データ（資産管理）を通じた LTV（顧客生涯価値）の最大化を目指しています。

### 🌟 主な提供価値
- **24時間365日自動予約受付**: LINE や Web を通じた自動予約受付により、電話に出られない時間帯の予約も確実に獲得。機会損失を最大 30% 削減。
- **家カルテ (House Karte)**: エアコンや水回りなどの住宅設備情報を構造化して管理し、適切なタイミングでのメンテナンス提案を可能に。
- **FC 対応アーキテクチャ**: 大規模なフランチャイズ運営をサポートするマルチテナント構造。
- **組み込みフィンテック**: Stripe Connect による決済と精算業務の自動化。

> [!TIP]
> **一点突破の機能**: Amber の核心価値は「24時間365日自動予約受付システム」です。現場作業中に電話に出られず予約を取りこぼす課題を解決し、売上平均25%向上を実現します。

---

## 📚 ドキュメント体系

本プロジェクトは **「唯一の真実 (Single Source of Truth)」** ポリシーを採用しています。すべての開発は PRD に基づいて行われます。

| ドキュメント | 役割 |
| :--- | :--- |
| **[PRD (最重要)](file:///Users/ayumu/Amber-House-PJ/docs/prd.md)** | **すべての基準。** ビジネスゴール、機能詳細、ロードマップ。 |
| **[進捗管理](file:///Users/ayumu/Amber-House-PJ/docs/PROGRESS.md)** | **進捗確認用。** Phase別進捗、TODOリスト、機能実装状況。 |
| **[開発ガイド](file:///Users/ayumu/Amber-House-PJ/DEVELOPMENT.md)** | 技術スタックの詳細、アーキテクチャ、環境構築。 |
| **[コントリビュートガイド](file:///Users/ayumu/Amber-House-PJ/CONTRIBUTING.md)** | Git フロー、コード規約、PR プロセス。 |
| [デザインガイドライン](file:///Users/ayumu/Amber-House-PJ/docs/design_guidelines.md) | ビジュアル、コンポーネント、UX 原則。 |
| [API 仕様書](file:///Users/ayumu/Amber-House-PJ/docs/api_spec.md) | 内部・外部 API の定義。 |
| [VercelとMCP連携ガイド](file:///Users/ayumu/Amber-House-PJ/docs/vercel-mcp-integration.md) | Vercel環境変数とMCPサーバーの連携方法。 |

---

## 🛠️ 技術スタック

### フロントエンド
- **フレームワーク**: [Next.js 15+](https://nextjs.org/) (App Router, React 19)
- **スタイリング**: [Tailwind CSS](https://tailwindcss.com/)
- **UI コンポーネント**: [shadcn/ui](https://ui.shadcn.com/)
- **状態管理/フェッチ**: React Query, Zustand

### バックエンド ＆ インフラ
- **プラットフォーム**: [Supabase](https://supabase.com/) (PostgreSQL, RLS, Auth, Storage)
- **デプロイ**: [Vercel](https://vercel.com/)
- **外部連携**: Stripe Connect, LINE Messaging API

---

## 🚀 クイックスタート

### 前提条件
- Node.js (v20+)
- npm または pnpm
- Supabase CLI (ローカル開発用)

### 手順
1. **リポジトリをクローン**
2. **依存関係のインストール**
   ```bash
   npm install
   ```
3. **環境変数の設定**
   ```bash
   cp .env.local.example .env.local
   # 必要な API キーを設定してください
   ```
4. **MCPサーバーの設定（オプション）**
   ```bash
   # 環境変数の検証
   ./scripts/check-mcp-env.sh
   
   # MCP設定ファイルを自動作成
   ./scripts/setup-mcp.sh
   
   # またはテンプレートからコピー
   cp .cursor/mcp.json.example .cursor/mcp.json
   
   # 詳細は docs/vercel-mcp-integration.md を参照
   ```
5. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

---

## 📁 ディレクトリ構造

```text
.
├── src/
│   ├── app/              # Next.js App Router (ページ ＆ API)
│   ├── components/       # UI コンポーネント (機能別)
│   │   ├── ui/           # 原子的な shadcn コンポーネント
│   │   └── features/     # ビジネスロジックを含むコンポーネント
│   ├── lib/              # ユーティリティと共通ロジック
│   ├── hooks/            # カスタムフック
│   └── types/            # TypeScript 型定義
├── supabase/
│   ├── migrations/       # DB スキーマ移行ファイル
│   └── functions/        # エッジ関数
├── docs/                 # 製品・技術ドキュメント
└── public/               # 静的アセット
```

---

## 🛡️ コントリビューターへの鉄則

- **SSOT 遵守**: 実装前に必ず [prd.md](file:///Users/ayumu/Amber-House-PJ/docs/prd.md) を確認してください。
- **セキュリティ**: Supabase の RLS ポリシーを活用し、クライアント側からの認可操作を信頼しないでください。
- **UX**: `docs/design_guidelines.md` で定義された日本市場向けの UI/UX 基準に従ってください。

---
© 2024 株式会社Amber. All rights reserved.
