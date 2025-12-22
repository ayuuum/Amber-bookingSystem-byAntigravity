# Amber - AI-Native FSM Platform

> [!IMPORTANT]
> **Single Source of Truth (SSOT)**
> 本プロジェクトの全仕様は [PRD（プロダクト要求仕様書）](file:///Users/ayumu/Amber-House-PJ/docs/prd.md) に集約されています。
> 開発・デザイン・議論の際は、必ず PRD を最上位のドキュメントとして参照してください。

## 1. プロジェクト概要
Amber（アンバー）は、ハウスクリーニング・住宅メンテナンス業界の DX を推進し、予約の自動化と顧客資産（住宅設備）の管理を通じた LTV 最大化を目指す、マルチテナント対応のバーティカル SaaS です。

**【ビジネス・トラクション】**
- **導入内定**: 全国 **70店舗** を展開するハウスクリーニングフランチャイズの運営基盤として採用が決定しています。

## 2. ドキュメント体系
プロジェクトの理解と開発のために、以下のドキュメントを参照してください。

| ドキュメント | 役割 |
| :--- | :--- |
| **[PRD (最重要)](file:///Users/ayumu/Amber-House-PJ/docs/prd.md)** | **「唯一の真実」。** 背景、課題、機能、収益モデル、ロードマップ。 |
| [デザインガイドライン](file:///Users/ayumu/Amber-House-PJ/docs/design_guidelines.md) | 日本市場に適したビジュアル・体験指針。 |
| [技術・外部連携仕様書](file:///Users/ayumu/Amber-House-PJ/docs/api_spec.md) | 内部 API、Stripe、LINE、Google 連携の詳細仕様。 |
| [Google Calendar 連携ガイド](file:///Users/ayumu/Amber-House-PJ/docs/google_calendar_guide.md) | 実装済みのカレンダー同期機能の解説。 |
| [変更履歴 (CHANGELOG)](file:///Users/ayumu/Amber-House-PJ/docs/CHANGELOG.md) | 開発マイルストーンと変更点。 |

---

## 3. 開発者向けクイックスタート

### 環境構築
```bash
npm install
cp .env.local.example .env.local # 各種 API キーを設定してください
npm run dev
```

### 技術スタック
- **Frontend**: Next.js (App Router), Tailwind CSS, shadcn/ui
- **Backend / DB**: Supabase (PostgreSQL, RLS, Auth)
- **Infrastructure**: Vercel
- **External**: Stripe Connect, LINE Messaging API

---

## 4. AI エージェント ＆ 開発者への鉄則
- 常に **`docs/prd.md`** を最新の状態に保つ。
- 実装が PRD と矛盾しそうな場合は、コードを書く前に PRD の修正を提案し合意を得る。
- 新機能の追加は、まず PRD のロードマップに反映してから開始する。
