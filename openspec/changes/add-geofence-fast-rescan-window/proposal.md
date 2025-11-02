## Why
ジオフェンス入場直後の単発スキャンでは研究室に到着する前にデバイスを検出できず、最初の BackgroundFetch が走るまで最大 15 分のギャップが発生しているため、入室が即時に確定しない。

## What Changes
- ジオフェンス入場後の短時間（例: 5 分間）に限り、バックグラウンドで 30〜60 秒間隔の軽量再スキャンを自動で繰り返す「高速リカバリ」ウィンドウを導入する
- ウィンドウ終了後は既存の 15 分間隔 BackgoundFetch スケジュールへフォールバックし、バッテリー消費を抑える
- ユーザー ID が未設定の場合は高速再試行も実行しないよう、既存のガードと整合させる

## Impact
- Affected specs: background-ble-maintenance
- Affected code: tasks/geofencingTask.ts, tasks/periodicCheckTask.ts, utils/notifications.ts (新規ログ/通知が必要な場合)
