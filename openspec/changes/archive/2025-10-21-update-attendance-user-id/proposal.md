## Why

`useBLE`, `geofencingTask`, および `periodicCheckTask` の出席 API ペイロードでは `userId` が固定文字列 "your-user-id" のままです。実ユーザー ID を送信できないため、サーバー側で在室状況を正しく紐付けできず、ジオフェンスや BLE タスク全体の目的を果たせません。バックグラウンドタスクでも利用できる永続的なユーザー ID 取得手段を整備し、全ての出席 API 呼び出しが動的 ID を利用するようにします。

## What Changes

- AsyncStorage で永続化できるユーザー ID ストレージ (`state/userProfile.ts`) と React Hook (`useUserProfile`) を追加し、フォアグラウンド UI から設定・取得できるようにする
- BLE とジオフェンス関連の API 呼び出しでストレージから取得した `userId` を利用し、未設定時にはログとフォールバックを提供
- `AttendancePage` からスキャン/切断フローにユーザー ID を連携させ、ユーザーが未設定なら操作前に警告を出す
- OpenSpec にユーザー ID 永続化と API 連携の要件を追加/更新する

## Impact

- Affected specs: `user-identity` (new), `attendance-ui`, `background-ble-maintenance`
- Affected code: `state/*`, `hooks/useBLE.ts`, `tasks/geofencingTask.ts`, `tasks/periodicCheckTask.ts`, `components/pages/AttendancePage.tsx`
