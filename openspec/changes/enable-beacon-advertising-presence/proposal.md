## Why

LINBLEZ-2 ビーコンは同時に 1 台のスマホとしか GATT 接続を維持できず、現行の在室判定が接続完了を前提としているため、その他の端末では在室状態に遷移できない。複数人が同じビーコンを共有する研究室では「接続できない端末は常に未確認」の状態になってしまい、在室記録の欠損と API コールの偏りが発生する。

## What Changes

- BLE 接続を行わず、広告パケット検知だけで `PRESENT` を確定できる在室判定フローを導入する
- 広告検知の有効期限 (3 分) を設け、検知が途切れた場合は `UNCONFIRMED` にフォールバックする
- 入室 API の送信を広告検知セッション単位で一度に制限し、複数端末から重複送信しないようにする
- 接続が不要になったことで通知文言や UI ステータスを「検出ベース」に更新する

## Impact

- Affected specs: background-ble-maintenance
- Affected code: hooks/useBLE.ts, tasks/geofencingTask.ts, tasks/periodicCheckTask.ts, state/appState.ts, components/molecules/StatusIndicator.tsx, utils/notifications.ts
