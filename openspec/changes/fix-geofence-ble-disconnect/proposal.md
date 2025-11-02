## Why

ジオフェンス入場時に `geofencingTask` が BLE デバイスへ接続すると、ビーコンの電波が途切れても接続状態のまま残り続けます。フォアグラウンドの `useBLE` フローでは切断検知と状態更新が行われていますが、バックグラウンド接続では `device.onDisconnected` の購読や RSSI 監視が設定されていないため、在室ステータスが誤って `PRESENT` のまま保持されます。

## What Changes

- `geofencingTask` でのバックグラウンド接続処理に切断監視を追加し、BLE 信号が失われた際に `INSIDE_AREA` へ状態復帰させます。
- 必要に応じて RSSI フェッチや接続有無チェックを行い、バックグラウンド接続が孤立して残らないようガードします。
- `background-ble-maintenance` 仕様を更新し、ジオフェンスタスクが接続した BLE デバイスの切断検知と状態更新を行うことを明文化します。

## Impact

- 影響する仕様: `background-ble-maintenance`。
- 影響するコード: `tasks/geofencingTask.ts`（接続処理・監視）、必要であれば `tasks/periodicCheckTask.ts`（バックグラウンド監視共有）。
- リスク: バックグラウンド実行制限により `onDisconnected` が呼ばれない場合、追加の RSSI/接続チェックが必要になるため、実機テストでの検証が必須です。
