## Why

ジオフェンス入場によるバックグラウンド接続フローは一度切断されると、再びエリアに入っても自動再接続が実行されません。`setAppState('INSIDE_AREA')` までは遷移しますが、BLE の再スキャンが起動せず、ユーザーは手動でダッシュボードから接続をやり直す必要があります。バックグラウンド経由の在室体験を損なっているため、再入場時に自動で BLE スキャンと再接続を行う仕組みが必要です。

## What Changes

- `background-ble-maintenance` 仕様を更新し、INSIDE_AREA → PRESENT の自動再接続がジオフェンス再入場や周辺タスクから確実に実行されることを明文化します。
- `geofencingTask` で INSIDE_AREA のまま再入場した場合にも BLE スキャンを再試行するようロジックを調整します。
- `periodicCheckTask` など既存のバックグラウンド処理を見直し、INSIDE_AREA が継続していて BLE が未接続の場合はリトライをスケジュールし続けるようにします。

## Impact

- 影響する仕様: `background-ble-maintenance`。
- 影響するコード: `tasks/geofencingTask.ts`, `tasks/periodicCheckTask.ts`、必要に応じて `hooks/useBLE.ts` の接続採用ロジック。
- リスク: バックグラウンドで過剰にスキャンを繰り返すと消費電力が増えるため、リトライの間隔やガード条件を適切に設計する必要があります。
