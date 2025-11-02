## Why

初回インストール直後にユーザー ID を登録していない場合でも、バックグラウンドのジオフェンス/定期タスクが BLE 接続を試みてしまい、匿名状態で在室処理が走り得るため。

## What Changes

- 永続化されたユーザー ID が取得できない場合、バックグラウンドの BLE 接続シーケンス全体をスキップするガードを追加する
- ガードでスキップした際に原因をログへ残し、後続タスクへ連鎖しないよう早期終了する

## Impact

- Affected specs: background-ble-maintenance
- Affected code: tasks/geofencingTask.ts, tasks/periodicCheckTask.ts, hooks/useBLE.ts
