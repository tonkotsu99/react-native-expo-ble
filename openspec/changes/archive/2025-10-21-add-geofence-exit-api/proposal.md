## Why

`tasks/geofencingTask.ts` の退出処理ではログと `BackgroundFetch.stop()` のみが呼ばれ、コメントに記載された退室 API 呼び出しが未実装です。そのため、ユーザーがジオフェンス外に出ても在室管理サーバーへ退室が通知されず、状態の整合性が取れません。退室イベントの API 呼び出しと状態管理を追加する変更が必要です。

## What Changes

- `geofencingTask` の Exit 分岐で、ユーザー識別子を元に退室 API (`API_URL_EXIT`) を呼び出す
- BLE 切断が発生していないケースでも最終的に `setAppState('OUTSIDE')` を安定させる
- 通信エラー時のログとリトライ方針を決め、少なくとも 1 回の POST を保証する
- 背景メンテナンス仕様 (`background-ble-maintenance`) に退室 API 呼び出し要件を追加

## Impact

- Affected specs: `background-ble-maintenance`
- Affected code: `tasks/geofencingTask.ts`, 必要に応じてユーザー ID 取得ロジック
