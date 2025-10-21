## Why

15 分ごとの在室確認タスクが毎回入室 API を送信しており、既に在室として登録済みのセッションでも重複リクエストが発生してしまう。API 側の負荷と二重記録防止のため、在室状態が変化しない限り再送を避けたい。

## What Changes

- PeriodicCheck タスクのロジックを更新し、前回の状態が在室 (`PRESENT`) のまま変化していない場合は入室 API を送信しない
- 状態が変化したタイミングでのみ入室 API を送信するようログとフローを整理する

## Impact

- Affected specs: background-ble-maintenance
- Affected code: tasks/periodicCheckTask.ts, state/appState.ts (読み取りロジック), bluetooth/useBLE.ts (必要に応じて)
