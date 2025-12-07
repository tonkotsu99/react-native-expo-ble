## 1. Investigation / Diagnostics

- [x] 1.1 追加ログとデバッグ通知でジオフェンス入場ハンドラがバックグラウンドで呼ばれていることを検証する
- [x] 1.2 `BleManager` の `state()` / `onStateChange` を計測し、PoweredOff/Unknown 状態からの復帰待ちが必要か確認する

## 2. Implementation

- [x] 2.1 iOS 専用の Bluetooth 復帰待機ユーティリティを追加し、バックグラウンド時に `PoweredOn` になるまでスキャンを開始しないようガードする
- [x] 2.2 `geofencingTask` の入場処理で復帰待機 → スキャン → 接続を直列化し、失敗時は高速再試行ウィンドウへエスカレーションする
- [x] 2.3 `periodicCheckTask` でも同じ待機ロジックを利用し、バックグラウンドから再スキャンした際に即座に在室確定できるよう統一する

## 3. Validation

- [x] 3.1 `npm run lint` を実行し、静的検証をパスさせる
- [ ] 3.2 iOS 実機でバックグラウンド状態から学外 → 学内移動を行い、BLE 接続と在室遷移が自動で成立することを確認する
