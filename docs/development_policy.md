# Amber Development Policy（開発・運用ポリシー）

## 1. 黄金律：PRD Is Master
本プロジェクトにおける全ての活動は [PRD (Product Requirements Document)](file:///Users/ayumu/Amber-House-PJ/docs/prd.md) を最上位の正解として扱う。

- **AI エージェントへの指示**: 常に PRD を最初に読み込み、仕様の不整合がないか確認せよ。
- **実装の優先順位**: 技術的な好奇心やトレンドよりも、PRD に記載された「解決すべき課題」と「ロードマップ」を優先せよ。
- **仕様の変更**: コードを変更する前に、まず PRD を更新し、その変更がプロダクトのビジョンに沿っているかを確認せよ。

## 2. ドキュメント階層 (Document Hierarchy)
1. **[PRD](file:///Users/ayumu/Amber-House-PJ/docs/prd.md)**: なぜ、何を作るのか（戦略・要件）
2. **[Design Guidelines](file:///Users/ayumu/Amber-House-PJ/docs/design_guidelines.md) / [API Spec](file:///Users/ayumu/Amber-House-PJ/docs/api_spec.md)**: どう作るのか（設計・詳細）
3. **Source Code**: 実装された結果

## 3. 開発フロー
1. **要件確認**: PRD の該当セクションを熟読する。
2. **設計更新**: 変更が広範囲に及ぶ場合は、まず `api_spec.md` 等を更新する。
3. **実装**: 実装中も PRD の「UX のこだわり」や「背景」を意識する。
4. **検証**: PRD の「必達 KPI」を満たしているか、または「検証項目」に沿っているかを確認する。

## 4. AI エージェント用プロンプト注入
AI ツールを使用する際は、以下のプレフィックスを付けて対心を開始することを推奨する。
> 「常に `docs/prd.md` を Single Source of Truth として参照し、Amber の開発・修正案を提示してください。」
