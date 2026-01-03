# Amber Design System

本ドキュメントは、Amberプラットフォームのデザインシステムを定義します。

## カラーパレット

### 基本色

| 色名 | CSS変数 | カラーコード | 用途 |
|------|---------|-------------|------|
| Primary | `--primary` | `#0a0a0a` | 主要なボタン、アクセント |
| Primary Foreground | `--primary-foreground` | `#ffffff` | Primary色のテキスト |
| Secondary | `--secondary` | `#f4f4f5` | カード背景、境界線 |
| Secondary Foreground | `--secondary-foreground` | `#18181b` | Secondary色のテキスト |
| Muted | `--muted` | `#f4f4f5` | 控えめな背景 |
| Muted Foreground | `--muted-foreground` | `#52525b` | 補助的なテキスト（WCAG AA準拠） |
| Accent | `--accent` | `#f4f4f5` | ホバー状態 |
| Accent Foreground | `--accent-foreground` | `#0a0a0a` | Accent色のテキスト |
| Destructive | `--destructive` | `#ef4444` | エラー、削除ボタン |
| Destructive Foreground | `--destructive-foreground` | `#ffffff` | Destructive色のテキスト |
| Warning | `--warning` | `#f59e0b` | 警告、注意喚起 |
| Warning Foreground | `--warning-foreground` | `#ffffff` | Warning色のテキスト |
| Warning Light | `--warning-light` | `#fef3c7` | 警告背景（ライト） |
| Warning Border | `--warning-border` | `#fde68a` | 警告境界線 |

### 背景・境界線

| 色名 | CSS変数 | カラーコード | 用途 |
|------|---------|-------------|------|
| Background | `--background` | `#fafafa` | ページ背景 |
| Foreground | `--foreground` | `#0a0a0a` | メインテキスト |
| Card | `--card` | `#ffffff` | カード背景 |
| Card Foreground | `--card-foreground` | `#0a0a0a` | カード内テキスト |
| Border | `--border` | `#e4e4e7` | 境界線 |
| Input | `--input` | `#e4e4e7` | 入力フィールド背景 |
| Ring | `--ring` | `#0a0a0a` | フォーカスリング |

### ダークモード

ダークモードでは、すべての色が自動的に調整されます。`globals.css`の`.dark`クラスで定義されています。

## タイポグラフィ

### フォントファミリー

- **日本語**: `Noto Sans JP` (優先) → `Hiragino Kaku Gothic ProN` → `Meiryo` (フォールバック)
- **英語**: `Inter` (優先) → システムフォント (フォールバック)

### フォントサイズ

| 要素 | サイズ | 行間 | 用途 |
|------|--------|------|------|
| h1 | `text-4xl md:text-5xl lg:text-6xl` | `1.2` | ページタイトル |
| h2 | `text-3xl md:text-4xl` | `1.3` | セクションタイトル |
| h3 | `text-2xl md:text-3xl` | `1.4` | サブセクションタイトル |
| Body | `text-base` (16px) | `1.6-1.8` | 本文 |
| Small | `text-sm` (14px) | `1.5` | 補助テキスト |
| XSmall | `text-xs` (12px) | `1.4` | キャプション |

### フォント設定

```css
font-feature-settings: "pkna", "palt"; /* 日本語のプロポーショナル文字 */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

## スペーシングシステム

| サイズ | 値 | 用途 |
|--------|-----|------|
| xs | `0.25rem` (4px) | 最小間隔 |
| sm | `0.5rem` (8px) | 小間隔（タッチターゲット間の最小間隔） |
| md | `1rem` (16px) | 標準間隔 |
| lg | `1.5rem` (24px) | 大間隔 |
| xl | `2rem` (32px) | 特大間隔 |

## ボーダーラディウス

| サイズ | 値 | 用途 |
|--------|-----|------|
| sm | `calc(var(--radius) - 4px)` | 小要素 |
| md | `calc(var(--radius) - 2px)` | 中要素 |
| lg | `var(--radius)` (0.75rem) | 標準（カード、ボタン） |
| xl | `calc(var(--radius) + 4px)` | 大要素 |
| 2xl | `calc(var(--radius) + 8px)` | 特大要素 |
| full | `9999px` | 完全に丸い（ピルボタン） |

## コンポーネント

### Button

```tsx
import { Button } from "@/components/ui/button"

// 基本使用
<Button>クリック</Button>

// バリアント
<Button variant="default">デフォルト</Button>
<Button variant="destructive">削除</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="secondary">セカンダリ</Button>
<Button variant="ghost">ゴースト</Button>
<Button variant="link">リンク</Button>

// サイズ
<Button size="sm">小</Button>
<Button size="default">標準</Button>
<Button size="lg">大</Button>
<Button size="icon">アイコンのみ</Button>
```

**注意**: すべてのボタンは最小44x44pxのタッチターゲットサイズを確保しています。

### LoadingState

```tsx
import { LoadingState, LoadingSpinner, Skeleton } from "@/components/ui/loading"

// フルページローディング
<LoadingState message="読み込み中..." />

// スピナーのみ
<LoadingSpinner size="md" />

// スケルトンローディング
<Skeleton className="h-4 w-full" />
```

### EmptyState

```tsx
import { EmptyState } from "@/components/ui/empty-state"

<EmptyState
  icon={<Inbox className="w-12 h-12" />}
  title="データがありません"
  description="まだデータが登録されていません。"
  action={<Button>新規作成</Button>}
/>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
  </CardHeader>
  <CardContent>
    コンテンツ
  </CardContent>
  <CardFooter>
    フッター
  </CardFooter>
</Card>
```

## アニメーション

### トランジション時間

| 種類 | 時間 | 用途 |
|------|------|------|
| Fast | `150ms` | ホバー効果 |
| Normal | `300ms` | 標準トランジション |
| Slow | `500ms` | 複雑なアニメーション |

### イージング関数

```css
cubic-bezier(0.16, 1, 0.3, 1) /* 標準イージング */
```

## アクセシビリティ

### WCAG 2.1 AA準拠

- **コントラスト比**: テキストと背景のコントラスト比は4.5:1以上を確保
- **タッチターゲット**: 最小44x44px
- **キーボード操作**: すべてのインタラクティブ要素がキーボードで操作可能
- **ARIAラベル**: アイコンボタン、フォーム要素に適切なARIAラベルを設定

### フォーカス表示

すべてのインタラクティブ要素は、キーボードフォーカス時に明確なリングを表示します：

```css
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```

## モバイル最適化

### フォントサイズ

- 入力フィールドは16px以上（iOSの自動ズームを防止）
- デスクトップでは14pxに縮小

### タッチターゲット

- 最小サイズ: 44x44px
- 間隔: 8px以上
- `touch-manipulation` CSSプロパティを適用

### レスポンシブデザイン

- テーブルはモバイルでカード表示に変換
- 横スクロールを防止
- モバイルメニューはSheetコンポーネントを使用

## 使用例

### フォーム

```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

<FormField
  control={control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>メールアドレス</FormLabel>
      <FormControl>
        <Input {...field} type="email" />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### トースト通知

```tsx
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()

toast({
  title: "成功",
  description: "操作が完了しました。",
  variant: "default",
})
```

## ベストプラクティス

1. **色の使用**: ハードコードされた色は使用せず、CSS変数を使用する
2. **コンポーネントの再利用**: 既存のUIコンポーネントを優先的に使用
3. **アクセシビリティ**: すべてのインタラクティブ要素にARIAラベルを設定
4. **モバイル対応**: デスクトップとモバイルの両方でテスト
5. **パフォーマンス**: アニメーションは軽量に保つ







