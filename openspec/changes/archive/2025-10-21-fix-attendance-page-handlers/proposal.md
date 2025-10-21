## Why

AttendancePage.tsx では `isScannig` 状態が UI に反映されず、`disconnectDevice` もどこにも渡していないため、ユーザーがローディング状態や手動の退室操作を行えません。手動操作を提供するというプロジェクト目的に反しているため修正が必要です。

## What Changes

- `AttendancePage` から `ActionPanel` へスキャン中フラグと切断ハンドラーを受け渡し、UI とフックの状態を同期させる
- ステータスヘッダーに接続状態を表示し、スキャン完了後に UI が適切に更新されるようにする
- `attendance-ui` スペックに状態同期と退室操作を明記する

## Impact

- Affected specs: `attendance-ui`
- Affected code: `components/pages/AttendancePage.tsx`, `components/organisms/ActionPanel.tsx`
