## 1. Implementation

- [x] 1.1 iOS バックグラウンド設定の見直し

  - app.json の `ios.infoPlist.UIBackgroundModes` に `bluetooth-central`, `location`, `fetch`, `processing` を設定（重複除去）
  - react-native-ble-plx の Expo プラグイン設定は維持（`isBackgroundEnabled: true`, `modes: ["central"]`）

- [x] 1.2 BleManager の State Restoration 対応

  - `bluetooth/bleManagerInstance.ts` に `restoreStateIdentifier` と `restoreStateFunction` を付与
  - 復元時にログと簡易的な自己診断（接続済みデバイス確認）を実施

- [x] 1.3 ジオフェンス入場ハンドラの診断強化

  - `tasks/geofencingTask.ts` の Enter イベントで、到達確認のローカル通知（デバッグ）を送信（開発ビルドのみ／環境フラグ）
  - `initPeriodicTask()` 実行と `BackgroundFetch.start()` を一度だけ行うガードを追加

- [x] 1.4 BackgroundFetch の運用安定化

  - `tasks/periodicCheckTask.ts` ログの粒度調整（開始/終了、タイムアウト、権限不足）
  - iOS 権限チェックの分岐を維持（`State.PoweredOn` のみ許可）

- [x] 1.5 ドキュメント/検証手順の追加
  - README.md（もしくは openspec/project.md の付録）に iOS 実機テスト手順を追記
    - Dev Client / TestFlight の前提
    - 端末設定: 位置情報「常に許可」, Bluetooth ON, 通知許可
    - 現地移動（学外 → 学内）時の期待ログ/通知一覧

## 2. Validation

- [ ] 2.1 EAS Dev Client で実機テスト（iOS）

  - 学外 → 学内: ジオフェンス入場通知（およびデバッグ通知）を受信
  - 入場後 0〜1 回の軽量スキャンから BLE 接続確立、在室 (PRESENT) へ遷移、接続通知を受信
  - BackgroundFetch により 15 分間隔で再スキャン（未接続時のみ）

- [ ] 2.2 ログ検証

  - geofencingTask: Enter 受領ログ、InsideArea ステータス投稿ログ
  - periodicCheckTask: configure/start/finish、timeout、権限不足ログ
  - bleManager restore: 復元コールバック到達ログ

- [ ] 2.3 回帰確認
  - Android での挙動に影響がないこと（最低限の smoke test）
