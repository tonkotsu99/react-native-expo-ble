## Why

iOS バックグラウンドでジオフェンス入場イベントは発火し、学内 / 学外の状態遷移と BLE 切断検知も成立していますが、研究室に入った際の BLE 接続処理がバックグラウンドでは成立していません。その結果、ユーザーはアプリを前面に出さない限り在室状態へ遷移できず、期待する自動入室体験が欠落しています。

## What Changes

- `background-ble-maintenance` 仕様を更新し、iOS バックグラウンドでのジオフェンス入場時に BLE 接続リトライが必ず起動し、Bluetooth 電源状態の復帰待機とスキャン完了までのデバッグ計測を行うことを明文化します。
- `geofencingTask` / `periodicCheckTask` に iOS 向けの接続オーケストレーションを追加し、バックグラウンドハンドラ内で `BleManager` の状態復帰待ち → スキャン → 接続までを確実にトリガーするロジックを実装します。
- 失敗時の再試行ウィンドウや通知、ログを補強して、バックグラウンドで接続が成立しないケースを可視化しつつ回復可能なリトライを継続させます。

## Impact

- Affected specs: background-ble-maintenance
- Affected code: tasks/geofencingTask.ts, tasks/periodicCheckTask.ts, bluetooth/bleManagerInstance.ts, utils/notifications.ts
