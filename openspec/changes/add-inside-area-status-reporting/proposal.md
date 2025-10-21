## Why

ジオフェンス内に入ったものの BLE 接続が未確定な状態 (`INSIDE_AREA`) が継続すると、サーバー側では利用者が敷地内にいることを把握できず、入室 API との間で状態不整合が生じる。INSIDE_AREA 遷移時に明示的な通知を送ることで、サーバーにも最新の在圏状態を伝えたい。

## What Changes

- `INSIDE_AREA` 遷移時に専用の API エンドポイントへユーザー ID と現在時刻を POST し、サーバーに敷地内滞在を知らせる
- ジオフェンシングタスクと定期チェックタスク内に重複送信防止とログ出力を追加し、`INSIDE_AREA` 状態が維持されている間は同じ通知を再送しない

## Impact

- Affected specs: background-ble-maintenance
- Affected code: constants/index.ts, tasks/geofencingTask.ts, tasks/periodicCheckTask.ts, state/appState.ts (必要に応じて)
