## 1. Implementation

- [x] 1.1 Specs: 本変更のデルタを追加（このディレクトリ配下の `specs/attendance-ui/spec.md`）
- [x] 1.2 UI: `components/atoms/ThemeToggleButton.tsx` を未参照化（削除は保留）
- [x] 1.3 Templates: `EnhancedMainTemplate`, `DashboardTemplate`, `SettingsTemplate` から ThemeToggle 関連 props/レンダリングを削除（Settings は appearance セクションを無効化）
- [x] 1.4 Organisms: `StatusDashboard` の `showThemeToggle`, `onThemeToggle` を削除
- [x] 1.5 Pages: `AttendancePage`, `SettingsPage` の `onThemeChange` ハンドラと渡し先を削除
- [x] 1.6 A11y: `utils/accessibility.ts` から `toggleTheme` ラベルを削除
- [x] 1.7 Icons: `constants/icons.ts` の `ThemeIcons`/`ThemeIconType` を削除
- [x] 1.8 Tamagui: `tamagui.config.ts` は現状維持（固定テーマ運用、選択 UI なし）

## 2. Validation

- [ ] 2.1 `openspec validate remove-appearance-theme --strict` を実行し、フォーマット/シナリオ要件を満たす
- [x] 2.2 `npm run lint` を実行し、未使用 import/型エラーがないことを確認（エラー出力なし）
- [ ] 2.3 ビルド起動（Dev Client）して UI からテーマ切替 UI が消えていることを確認
- [ ] 2.4 主要画面（Dashboard/Connection/Settings）で配色/コントラストが WCAG 2.1 AA を満たすか目視確認

## 3. Risks / Rollback

- ThemeToggleButton への参照漏れによりビルドエラーとなるリスク → 参照箇所の一括削除を徹底
- 配色依存のスタイルで dark 前提が混入している場合の視認性低下 → 主要コンポーネントを確認
- ロールバック: 変更前ブランチへ戻すか、ThemeToggle を復元
