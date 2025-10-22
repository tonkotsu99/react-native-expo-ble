# Design: Local Push Notifications

## Context

現在のアプリケーションは、ジオフェンシングとBLE接続による在室管理を行っていますが、バックグラウンドで発生するイベント（エリア入退出、BLE接続/切断、状態変化）をユーザーに伝える手段として `Alert.alert()` を使用しています。しかし、`Alert.alert()` はアプリがフォアグラウンドにある時のみ機能するため、バックグラウンドタスクからのイベント通知には不適切です。

ユーザーが研究室エリアに入った際や、BLEデバイスとの接続が確立された際に、アプリの状態に関わらず確実に通知を受け取れるようにする必要があります。

## Goals / Non-Goals

### Goals
- ジオフェンス入退出、BLE接続/切断、状態変化時にローカルプッシュ通知を送信する
- バックグラウンドタスク (`geofencingTask.ts`) から直接通知を送信できるようにする
- 既存の `Alert.alert()` をすべてローカル通知に置き換え、一貫性のある通知体験を提供する
- 通知パーミッションの要求と拒否時のグレースフルなハンドリング
- Android と iOS 両方で動作する

### Non-Goals
- リモートプッシュ通知（サーバーからのプッシュ）は本変更の範囲外
- 通知のカスタマイズUI（ユーザーが通知内容を編集する機能）は含まない
- 通知履歴の永続化や閲覧機能は含まない

## Decisions

### 1. Expo Notifications を使用
- **決定**: `expo-notifications` をローカル通知ライブラリとして採用
- **理由**:
  - Expo エコシステムとの統合が良好
  - Android と iOS の通知APIの差異を吸収
  - バックグラウンドタスクから直接呼び出し可能
  - ローカル通知とリモート通知の両方をサポート（将来の拡張性）
- **代替案**:
  - `react-native-push-notification`: より低レベルだが、Expo managed workflow では利用が複雑
  - ネイティブモジュール直接利用: プラットフォーム依存コードが増える

### 2. 通知送信の中央集約
- **決定**: `utils/notifications.ts` に通知送信ロジックを集約し、`hooks/useNotifications.ts` でReactフック形式のインターフェースを提供
- **理由**:
  - バックグラウンドタスク（TaskManager内）からはフックが使えないため、純粋な関数として `utils/notifications.ts` を用意
  - UIコンポーネントからはフック経由で利用可能にし、React のライフサイクルと統合
  - 通知メッセージのテンプレート管理を一箇所に集約
- **パターン**:
  ```typescript
  // utils/notifications.ts (純粋関数)
  export async function sendGeofenceEnterNotification() { ... }
  
  // hooks/useNotifications.ts (React Hook)
  export function useNotifications() {
    return { sendGeofenceEnterNotification, ... };
  }
  ```

### 3. Alert.alert の完全置き換え
- **決定**: すべての `Alert.alert()` 呼び出しをローカル通知に置き換え
- **理由**:
  - フォアグラウンド/バックグラウンドで一貫した通知体験
  - バックグラウンドタスクから呼び出せないAlert.alert を排除
  - 通知をシステム通知センターに蓄積できる（ユーザーが後から確認可能）
- **影響を受けるファイル**:
  - `hooks/useAttendanceUserId.ts`: ユーザーID保存時の成功/失敗通知
  - `hooks/useRequireUserId.ts`: ユーザーID未設定時の警告
  - 必要に応じて他の箇所も検索して置き換え

### 4. 通知メッセージの定義
- **決定**: 以下の通知タイプとメッセージを定義
  | イベント | タイトル | 本文 |
  |---------|---------|------|
  | ジオフェンス入場 | 九工大エリア | 九工大エリアに入りました |
  | ジオフェンス退出 | 九工大エリア | 九工大エリアを出ました |
  | BLE接続成功 | 研究室 | 研究室デバイスに接続しました |
  | BLE切断 | 研究室 | 研究室デバイスから切断されました |
  | 状態変化 (PRESENT) | 出席確認 | 出席状態になりました |
  | 状態変化 (UNCONFIRMED) | 出席確認 | 状態が未確認に変更されました |
- **理由**: ユーザーへの情報提供を目的とし、簡潔で分かりやすいメッセージにする

### 5. パーミッション要求タイミング
- **決定**: アプリ起動時 (`app/_layout.tsx`) に通知パーミッションを要求
- **理由**:
  - 位置情報やBLEパーミッションと同じタイミングでまとめて要求し、UXを統一
  - バックグラウンドタスクが動作する前にパーミッションを確保
- **拒否時の挙動**: 
  - 通知送信は試みるがエラーログのみ出力し、アプリの主機能は継続

### 6. 通知チャンネル設定 (Android)
- **決定**: `app.json` で Android 通知チャンネルを定義
  ```json
  "notification": {
    "icon": "./assets/icon.png",
    "color": "#0000FF"
  },
  "android": {
    "notificationChannels": [
      {
        "id": "default",
        "name": "Default",
        "importance": "DEFAULT",
        "sound": "default"
      }
    ]
  }
  ```
- **理由**: Android 8.0+ では通知チャンネルが必須

## Risks / Trade-offs

### リスク: 通知の過多
- **リスク**: ジオフェンス入退出やBLE接続が頻繁に発生する場合、通知が多すぎてユーザーを煩わせる可能性
- **軽減策**: 
  - 既存の `getInsideAreaReportStatus()` のような重複送信防止機構を活用
  - 通知の優先度を `DEFAULT` に設定し、サイレント通知も検討

### リスク: パーミッション拒否
- **リスク**: ユーザーが通知パーミッションを拒否した場合、重要な状態変化が伝わらない
- **軽減策**: 
  - アプリ内UIで現在の状態を常に表示（StatusIndicator）
  - パーミッション拒否時も通知送信は試みるが、エラーは静かに処理

### Trade-off: Alert.alert の即座性
- **Trade-off**: `Alert.alert()` はアプリ内でモーダルダイアログとして即座に表示されるが、通知はシステム通知トレイに蓄積される
- **判断**: バックグラウンド対応と一貫性を優先し、通知に統一する。フォアグラウンド時も通知を使用することで、ユーザー体験を統一

## Migration Plan

### ステップ1: 依存関係とセットアップ
1. `expo-notifications` をインストール
2. `app.json` に通知設定を追加
3. `app/_layout.tsx` で初期化とパーミッション要求

### ステップ2: 通知ユーティリティ実装
1. `utils/notifications.ts` に通知送信関数を実装
2. `hooks/useNotifications.ts` にReactフックを実装

### ステップ3: 段階的な統合
1. **まずジオフェンス**: `tasks/geofencingTask.ts` に通知を追加
2. **次にBLE**: `hooks/useBLE.ts` に通知を追加
3. **最後にAlert置き換え**: `useAttendanceUserId.ts`, `useRequireUserId.ts` を更新

### ステップ4: テストと検証
1. 実機/エミュレータでバックグラウンド通知を確認
2. フォアグラウンド通知の動作を確認
3. パーミッション拒否時の挙動を確認

### ロールバック
- 通知機能に問題がある場合、`utils/notifications.ts` の送信関数を空実装にすることで、既存機能への影響なく無効化可能
- Alert.alert への復帰は各ファイルで通知呼び出しをコメントアウトして Alert.alert を復元

## Open Questions

- **Q**: 通知の優先度（HIGH vs DEFAULT）はどの程度にすべきか？
  - **A**: 補助的な情報提供のため、DEFAULT を使用。将来的にユーザー設定で変更可能にすることを検討

- **Q**: iOS でのバックグラウンド通知制限はあるか？
  - **A**: Expo Notifications はローカル通知に対応しており、バックグラウンドタスク内から送信可能。ただし、実機でのテストが必要

- **Q**: 通知のローカライゼーションは必要か？
  - **A**: 現状は日本語のみ。将来的に i18n を導入する際に対応
