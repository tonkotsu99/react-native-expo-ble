## Why

アプリの UI から外観テーマ（ライト/ダーク/システム）の切り替えを廃止し、見た目の揺らぎと設定項目を減らしてシンプルさを優先したい。

## What Changes

- UI からテーマ切り替え（ThemeToggle）を削除する — "ThemeToggleButton" の利用箇所を撤去
- 仕様上の「テーマ切り替え」要件を削除/改名し、アクセシビリティ要件のみ維持
- Tamagui は固定テーマ（前提: light）で運用し、トークンはそのまま利用
- Settings/Dashboard のヘッダー等にある見た目切替 UI を非表示にする
- iOS/Android の外観モード追従（system）は無効化

## Impact

- Affected specs: `specs/attendance-ui/spec.md`
  - Requirement: "Enhanced Atomic Design System" から「light/dark 対応」「ThemeToggleButton」参照を削除
  - Requirement: "Theme and Accessibility Support" を "Accessibility Support" に改名し、テーマ切替シナリオを削除
- Affected code (予定):
  - `components/atoms/ThemeToggleButton.tsx`（削除 or デッドコード化）
  - `components/organisms/StatusDashboard.tsx`（ThemeToggle 表示を撤去）
  - `components/templates/*Template.tsx`（ThemeToggle props/レンダリング削除）
  - `components/pages/*Page.tsx`（onThemeChange ハンドラ削除）
  - `utils/accessibility.ts`（toggleTheme ラベル削除）
  - `constants/icons.ts`（ThemeIcons 未使用なら削除）
  - `tamagui.config.ts`（テーマは固定・設定は最小限に）

## Assumptions

- 固定テーマは "light" とする（必要なら "dark" に切替可能だが、ユーザー設定は持たない）。
- 既存のカラートークンやスタイルは温存し、可読性/コントラスト要件（WCAG 2.1 AA）は維持する。
