## 1. Implementation

- [x] 1.1 `periodicCheckTask` 内に BLE スキャン・接続処理を実装し、一定時間で停止する
- [x] 1.2 接続成功時に `setAppState('PRESENT')` と入室 API 通知を行うヘルパーを追加する
- [x] 1.3 スキャン失敗時のログとリトライ方針（状態維持/次回再実行）を整備する
- [x] 1.4 `background-ble-maintenance` スペックを追加して受け入れ条件を明文化する
- [x] 1.5 `npx eslint . --ext .ts,.tsx` などの検証を実行する（警告のみ）
