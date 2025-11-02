# Tasks: update-dashboard-card-width

## 1. Specification

- [x] 1.1 Update `attendance-ui` spec to require aligned widths for the dashboard status and BLE cards.

## 2. Implementation

- [x] 2.1 Update `StatusDashboard` layout so `StatusCard` と `ConnectionVisualization` の横幅が常に一致するようにする（flex 設定・スタイル調整を含む）。
- [x] 2.2 調整後に `ConnectionVisualization` や関連テンプレートでの余白／最小幅が正しく反映されるか確認し、必要なら共通スタイルを追加する。

## 3. Validation

- [x] 3.1 Run `npm run lint` and visually 確認 on device/emulator that the two cards align horizontally and stack gracefully on narrow widths.
