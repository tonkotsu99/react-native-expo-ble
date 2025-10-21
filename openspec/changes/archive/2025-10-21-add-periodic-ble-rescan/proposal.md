## Why

`tasks/periodicCheckTask.ts` には BLE の再スキャン処理が未実装のまま残っており、ジオフェンス内で接続が失われた際に背景タスクが自動復旧できません。このままでは在室状態が `INSIDE_AREA` や `UNCONFIRMED` のまま止まり、出席更新が行われないため、定期再スキャンと再接続ロジックを追加する必要があります。

## What Changes

- `periodicCheckTask` に軽量なスキャン＆接続処理を実装し、接続成功時に `setAppState('PRESENT')` と入室 API 呼び出しを行う
- BLE スキャン中はタイムアウトや停止処理を行い、未検出時は再度 `UNCONFIRMED` を維持する
- 失敗時のログと次回実行へのリトライ方針を定義
- OpenSpec に背景タスクによる BLE 再接続要件を追加

## Impact

- Affected specs: `background-ble-maintenance`
- Affected code: `tasks/periodicCheckTask.ts`, 必要に応じて共通 BLE/ネットワークヘルパー
