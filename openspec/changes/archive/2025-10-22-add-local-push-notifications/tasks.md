# Tasks: Add Local Push Notifications

## 1. Setup and Dependencies
- [x] 1.1 `package.json` に `expo-notifications` を追加してインストール
- [x] 1.2 `app.json` に通知パーミッション設定（`useNextNotificationsApi`, Android channels）を追加
- [x] 1.3 `app/_layout.tsx` で通知パーミッション要求とリスナー登録を初期化

## 2. Notification Utilities
- [x] 2.1 `utils/notifications.ts` を作成し、通知送信ヘルパー関数を実装
- [x] 2.2 通知チャンネル設定（タイトル、本文、優先度、サウンド）を定義
- [x] 2.3 フォアグラウンド通知ハンドラーを実装

## 3. Hook Implementation
- [x] 3.1 `hooks/useNotifications.ts` を作成し、パーミッション要求と通知送信ロジックを実装
- [x] 3.2 バックグラウンドでの通知送信をサポート
- [x] 3.3 通知タイプ別のメッセージテンプレートを定義

## 4. Geofencing Integration
- [x] 4.1 `tasks/geofencingTask.ts` のジオフェンス入場時に「九工大エリアに入りました」通知を送信
- [x] 4.2 `tasks/geofencingTask.ts` のジオフェンス退出時に「九工大エリアを出ました」通知を送信

## 5. BLE Integration
- [x] 5.1 `hooks/useBLE.ts` の接続成功時に「研究室デバイスに接続しました」通知を送信
- [x] 5.2 `hooks/useBLE.ts` の切断時に「研究室デバイスから切断されました」通知を送信
- [x] 5.3 状態変化（PRESENT, UNCONFIRMED）時の通知を追加

## 6. Replace Alert.alert
- [x] 6.1 `hooks/useAttendanceUserId.ts` の `Alert.alert` を通知に置き換え
- [x] 6.2 `hooks/useRequireUserId.ts` の `Alert.alert` を通知に置き換え
- [x] 6.3 その他の `Alert.alert` 使用箇所を検索して通知に置き換え

## 7. Testing and Validation
- [x] 7.1 デバイスでジオフェンス入退出時の通知を検証
- [x] 7.2 BLE 接続/切断時の通知を検証
- [x] 7.3 バックグラウンドとフォアグラウンド両方での通知動作を確認
- [x] 7.4 通知パーミッション拒否時のエラーハンドリングを確認
