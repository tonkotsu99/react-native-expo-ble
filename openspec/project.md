# プロジェクト概要

## 目的

九工大 4Lab 向けのモバイル在室管理アプリ。BLE スキャンと位置情報ジオフェンスを組み合わせて研究室の入退室を検知し、出席 API へ送信するとともに、Tamagui UI から手動操作も行えるようにする。

## 技術スタック

- Expo Router + React Native 0.74（TypeScript strict モード）
- React 18.2 と Tamagui コンポーネント（atoms / molecules / organisms / templates の層構造）
- Expo モジュール: `expo-location`, `expo-task-manager`, `expo-device`, `expo-splash-screen`, `expo-router`
- `react-native-ble-plx` による BLE スキャン・接続、`react-native-background-fetch` による定期実行
- `@react-native-async-storage/async-storage` を用いた AsyncStorage ベースのアプリ状態管理

## プロジェクト規約

### コードスタイル

- ESLint は Expo 既定設定を継承。コミット前に `npm run lint` を実行する。
- TypeScript は `strict` オプションを有効化し、`@/*` パスエイリアスで絶対パス import を行う。
- スタイル値は生値ではなく Tamagui トークン（`$5`, `$blue10` など）を優先し、atoms → molecules → organisms → templates の構成で画面を組み立てる。
- 副作用は `useBLE`, `useGeofencing` などのフック内に収め、BLE/ネットワーク処理に入る前に `setAppState` の完了を await して状態の整合性を保つ。

### アーキテクチャパターン

- エントリーポイントは `expo-router/entry`。`app/_layout.tsx` で `TamaguiProvider` によるラップと `StatusBar` マウント、`useGeofencing()` の初期化を 1 回だけ行う。
- 既定のルート `app/index.tsx` は `(tabs)` にリダイレクトし、タブは `DashboardPage` と `SettingsPage` の 2 画面をレンダリングする。ダッシュボードに BLE 手動操作を集約し、別タブを必要としない。
- BLE 制御は `hooks/useBLE.ts` に集約し、共有の `bleManager` シングルトンを利用してパーミッション確認・接続・出席 API 送信を行う。
- ジオフェンス系のバックグラウンド処理は `hooks/useGeofencing.ts` で登録され、`tasks/geofencingTask.ts` と `tasks/periodicCheckTask.ts` に実装を分担する。
- 永続化されたアプリ状態（`OUTSIDE`, `INSIDE_AREA`, `PRESENT`, `UNCONFIRMED`）は `state/appState.ts` で管理し、バックグラウンドタスクの挙動判断に利用する。

### テスト戦略

- 現状自動テストは未整備。Expo Go では必要なネイティブ機能が不足するため、カスタム Expo Dev Client またはスタンドアロンビルドで実機/エミュレータ検証を行う。
- 静的チェックとして `npm run lint` をプライマリな事前確認にする。

### Git ワークフロー

- デフォルトブランチは `main`。作業はフィーチャーブランチで行い、Pull Request 経由でマージする。
- 無関係な変更を同一ブランチに混在させず、PR 提出前に lint を通す。

## ドメインコンテキスト

- システムは九工大 4Lab のジオフェンス（緯度 `33.8823`, 経度 `130.8797`, 半径 `150m`）内外で状態を遷移させる。
- BLE デバイスは `BLE_SERVICE_UUID` をアドバタイズし、接続成功で在室扱いとする。切断時はアプリ状態を `UNCONFIRMED` に戻し、最終的には退出 API を叩く想定。
- 出席 API は `https://www.kyutech-4lab.jp/api/attendance/enter` と `/exit` を利用。現在は `userId` がプレースホルダーで、今後実ユーザー ID を通す必要がある。
- バックグラウンド処理では Android の Bluetooth／位置情報パーミッションを使用し、プロンプト文言は `app.json` に記載。

## 重要な制約

- BLE やバックグラウンド API は Expo Go では利用できないため、カスタム開発クライアントか単体ビルドで動作させる。
- `bleManager` インスタンスは必ず単一に保つ。複数生成するとネイティブ側が不安定になる。
- `device.onDisconnected` の購読は自動で解除しつつ状態更新を行い、リスナー漏れや在室状態の不整合を避ける。
- Bluetooth / 位置情報の拒否を適切に扱い、バックグラウンドタスクがクラッシュしないようエラーハンドリングする。

## iOS 実機検証メモ（背景タスク）

- 前提設定
  - 端末設定 > 位置情報: 常に許可
  - Bluetooth: ON、アプリの Bluetooth 権限許可
  - 通知: 許可
- ビルド前提
  - Dev Client または TestFlight/AdHoc ビルド（Expo Go 非対応）
  - Info.plist に `UIBackgroundModes = [bluetooth-central, location, fetch, processing]`
- 検証手順
  1.  学外（ジオフェンス外）から学内へ移動
  2.  入場イベント受領時に通知が届く（デバッグ通知を含む場合あり）
  3.  入場後、自動スキャンで BLE 接続 → 在室 (PRESENT) 遷移 → 接続通知
  4.  接続が切れた場合は定期チェック（~15 分）で再スキャンし、在室維持
  5.  学内 → 学外で退出通知と BackgroundFetch 停止

## 外部依存関係

- 九工大出席管理 REST エンドポイント: `https://www.kyutech-4lab.jp/api/attendance/enter`, `https://www.kyutech-4lab.jp/api/attendance/exit`
- `BLE_SERVICE_UUID` をブロードキャストするビーコンデバイス
- ジオフェンスのための Expo Location / Task Manager と Android/iOS のスケジューラ
- ジオフェンス内での定期 BLE スキャンに使用する `react-native-background-fetch`
