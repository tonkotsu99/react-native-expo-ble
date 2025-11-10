## 1. ネイティブモジュール実装

- [x] 1.1 Expo Config Plugin 作成: `plugins/withBeaconMonitoring.js` を作成し、iOS の `ios/` ディレクトリにネイティブコードを注入するロジックを実装する
- [x] 1.2 Swift モジュール実装: `ios/RNBeaconMonitoring.swift` を作成し、`CLLocationManager` を用いた iBeacon 領域監視 API (`startMonitoring`, `stopMonitoring`, `didEnterRegion`, `didExitRegion`) を実装する
- [x] 1.3 React Native フック作成: `hooks/useBeaconMonitoring.ts` を作成し、ネイティブモジュールへの Promise ベース呼び出しと `NativeEventEmitter` イベントリスナーを実装する
- [x] 1.4 定数定義追加: `constants/index.ts` にビーコン UUID, Major, Minor の定数を追加する (既存の `BLE_SERVICE_UUID` と併記)
- [x] 1.5 Plugin 登録: `app.json` の `plugins` 配列に `./plugins/withBeaconMonitoring` を追加する

## 2. ジオフェンスタスク改修

- [x] 2.1 ビーコン監視開始: `tasks/geofencingTask.ts` のジオフェンス ENTER 処理に、iOS の場合は `RNBeaconMonitoring.startMonitoring()` を呼び出すロジックを追加する
- [x] 2.2 ビーコンイベントリスナー: `geofencingTask.ts` で `beaconEnter` / `beaconExit` イベントを購読し、それぞれ `setAppState('PRESENT')` / `setAppState('UNCONFIRMED')` と API 送信を実行する
- [x] 2.3 ビーコン監視停止: `geofencingTask.ts` のジオフェンス EXIT 処理に、iOS の場合は `RNBeaconMonitoring.stopMonitoring()` を呼び出すロジックを追加する
- [x] 2.4 エラーハンドリング: ビーコン監視開始/停止の失敗時にログ記録と通知を送信し、iOS ではフォールバックとして既存の広告スキャンを継続する

## 3. 定期タスク改修

- [x] 3.1 iOS スキップガード: `tasks/periodicCheckTask.ts` の `periodicTask` 関数先頭に `Platform.OS === 'ios'` チェックを追加し、iOS では BLE スキャンをスキップする (ログ記録のみ実行)
- [x] 3.2 Android 動作確認: Android では既存の BLE スキャンロジックが引き続き実行されることを確認する
- [x] 3.3 フォールバックスキャン: iOS でビーコン監視が失敗した場合、60 分間隔のフォールバック BLE スキャンを実行するロジックを追加する (新しいフラグ `beaconMonitoringFailed` で制御)

## 4. 通知追加

- [x] 4.1 ビーコン入室通知: `utils/notifications.ts` に `sendBeaconEnterNotification(beaconName: string)` 関数を追加する
- [x] 4.2 ビーコン退室通知: `utils/notifications.ts` に `sendBeaconExitNotification(beaconName: string)` 関数を追加する
- [x] 4.3 ビーコンエラー通知: `utils/notifications.ts` に `sendBeaconMonitoringErrorNotification(errorMessage: string)` 関数を追加する
- [x] 4.4 通知呼び出し: `geofencingTask.ts` の該当箇所でこれらの通知関数を呼び出す

## 5. テスト・検証

- [ ] 5.1 Dev Client ビルド: `eas build --profile development --platform ios` でカスタム Dev Client をビルドし、実機にインストールする
- [ ] 5.2 ビーコン検知テスト: 学外 → 学内 → 研究室入室 → 研究室退室 → 学外のフルフローを実行し、各イベントで通知とログが正しく発火することを確認する
- [ ] 5.3 バックグラウンド検証: アプリをバックグラウンドに 30 分間放置後、研究室に入室してビーコン ENTER イベントが発火することを確認する
- [ ] 5.4 エラーケース検証: 位置情報権限を「使用中のみ」に変更し、ビーコン監視開始が失敗してフォールバックスキャンに切り替わることを確認する
- [ ] 5.5 Android 動作確認: Android Dev Client で既存の BLE スキャンフローが正常に動作することを確認する (iOS 変更の影響がないこと)
- [ ] 5.6 Lint チェック: `npm run lint` を実行し、すべてのエラーを解消する

## 6. ドキュメント更新

- [ ] 6.1 README 更新: iOS の iBeacon 監視フローを説明するセクションを `README.md` に追加する
- [ ] 6.2 ビーコン設定ガイド: ビーコンハードウェアの UUID/Major/Minor 設定手順を `docs/beacon-setup.md` (新規作成) にまとめる
- [ ] 6.3 トラブルシューティング: iOS でビーコン検知されない場合の確認項目 (権限、Bluetooth 設定、ビーコン電池など) をドキュメント化する
