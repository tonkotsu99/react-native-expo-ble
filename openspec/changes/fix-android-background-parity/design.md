## Context

- 現状: iOS では `TaskManager` / `BackgroundFetch` / BLE 接続が期待通り動作する。一方 Android ではアプリがバックグラウンドまたは終了するとジオフェンスイベント以降の処理が停止し、`AppState` が `INSIDE_AREA` のまま留まり出席 API が呼ばれない。ログからは TaskManager のハンドラが呼ばれないケースと、呼ばれても `device.connect()` で失敗しているケースの両方が疑われる。
- 前提: Android 8+ ではバックグラウンドで BLE スキャンを実行するにはフォアグラウンドサービス (永続通知) が推奨され、`react-native-ble-plx` でも `autoConnect` の利用が安定性向上に寄与する。Battery Optimization による制限や通知権限も別途必要となる。

## Goals

1. ジオフェンス入場・退出・定期チェックが Android バックグラウンドでも確実に呼ばれる。
2. バックグラウンドで BLE スキャン／接続が成立し、`setAppState('PRESENT')` と在室 POST が実行される。
3. 退出検知および切断時の `API_URL_EXIT` POST・通知送信も Android で完了する。
4. デバッグ手段 (通知・ログ) を整備して現象再発時に解析できる。

## Approach

- **タスク起動の確実化**: `expo-task-manager` で定義したジオフェンス／背景タスクが Android でも実行されるよう、`Location.startGeofencingAsync` の実行後に `TaskManager` 登録が成功したことを確認し、アプリ起動時に一度だけフォアグラウンドサービス用のチャンネルをセットアップする。
- **Foreground Service**: Android では BLE スキャンを行う前に `react-native-background-fetch` の `setMinimumFetchInterval` や `BackgroundFetch.start()` からフォアグラウンドサービスを起動し、常駐通知を表示する。スキャン完了／接続完了でサービスを停止し、長時間の場合は 5 分程度でタイムアウトする。
- **接続モード**: `react-native-ble-plx` の `device.connect()` に `autoConnect: true` (API >= 26) を付与し、`bleManager.connectToDevice` 経由へ統一する。失敗時は指数バックオフをかけた再試行とし、`backgroundScanInFlight` フラグで多重実行を防ぐ。
- **Battery Optimization**: 初回起動時に `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` を案内し、拒否時はリマインドを残す。設定画面へのディープリンクを `Linking.openSettings()` で提供する。
- **通知権限**: Android 13+ (API 33) では `POST_NOTIFICATIONS` を runtime で取得し、デバッグ通知・接続通知が確実に届くようにする。
- **計測・ログ**: `safeSendDebugNotification` を Android でも活用できるよう、権限チェック結果やフォアグラウンドサービス状態を payload に含める。ログは `LogBox.ignoreLogs` では抑制しない。

## Alternatives Considered

- **Pure autoConnect without foreground service**: 省電力だが Android 13 のスキャン制限により成功率が低く実用に耐えないと判断。
- **サーバーポーリングで在室判定**: ネットワーク負荷が高く、BLE 基盤を活かせないため不採用。

## Open Questions

- どの Android バージョン / 端末で現象が顕著か。特に MIUI や ColorOS のような aggressive killer が対象に含まれるかをヒアリングする。
- フォアグラウンドサービス通知の UX: 研究室常駐の前提で常時表示でも許容されるか、隠す工夫が必要かを確認する。
