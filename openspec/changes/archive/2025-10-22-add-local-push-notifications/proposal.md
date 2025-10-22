# Proposal: Add Local Push Notifications

## Why

現在、アプリはジオフェンス入退出やBLE接続/切断などの重要なイベント発生時に `Alert.alert()` を使用してユーザーへ通知していますが、アプリがバックグラウンドにある場合にはこれらの通知がユーザーに届きません。バックグラウンドでのジオフェンスやBLE状態変化をユーザーが把握できるよう、ローカルプッシュ通知機能を追加する必要があります。

## What Changes

- Expo Notifications を導入してローカルプッシュ通知機能を実装
- ジオフェンス領域への入退出時に通知を送信（「九工大エリアに入りました」「九工大エリアを出ました」）
- BLE デバイスへの接続/切断時に通知を送信（「研究室デバイスに接続しました」「研究室デバイスから切断されました」）
- 出席状態変化時（PRESENT, UNCONFIRMED）に通知を送信
- 既存の `Alert.alert()` 呼び出しをローカル通知に置き換え
- 通知パーミッション要求とハンドリングを追加
- バックグラウンド通知とフォアグラウンド通知の両方に対応

## Impact

- **新規 capability**: `notifications` を追加
- **既存 capability への影響**:
  - `background-ble-maintenance`: BLE接続/切断時の通知処理を追加
  - `attendance-ui`: UI操作時の通知を追加（Alert.alert からの移行）
- **コード影響範囲**:
  - `hooks/useBLE.ts`: Alert.alert を通知に置き換え
  - `hooks/useAttendanceUserId.ts`: Alert.alert を通知に置き換え
  - `hooks/useRequireUserId.ts`: Alert.alert を通知に置き換え
  - `tasks/geofencingTask.ts`: ジオフェンス入退出時に通知を追加
  - 新規 `hooks/useNotifications.ts`: 通知管理ロジック
  - 新規 `utils/notifications.ts`: 通知送信ヘルパー関数
  - `app.json`: 通知パーミッション設定を追加
  - `package.json`: `expo-notifications` 依存関係を追加
