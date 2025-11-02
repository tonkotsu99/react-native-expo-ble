# bleStatus (React Native + Expo)

Kyutech 在室管理クライアント。LINBLE ビーコンとの BLE 接続とジオフェンスを使って在室状態を管理し、サーバーへ記録します。Expo Router + TypeScript + Tamagui 構成で、背景タスク（BLE / 位置情報 / 定期処理）に対応しています。

## 主な機能

- BLE 接続（react-native-ble-plx）
  - 広域スキャン（OS にフィルター無し）+ JS 側で UUID/デバイス名をマッチ
  - 接続成功時に在室状態を PRESENT へ
  - 切断時は在室状態を INSIDE_AREA へ戻す（誤退出を避ける）
  - バックグラウンドで既存接続がある場合、フォアグラウンド UI が自動 Adopt
  - RSSI を 2s 間隔でポーリングして UI に表示
- ジオフェンス（expo-location + expo-task-manager）
  - Kyutech 領域に入退場でタスクが発火
  - ENTER 時に在室 API へ通知、必要に応じて BLE スキャン/接続を起動
- 定期チェック（react-native-background-fetch）
  - INSIDE_AREA / UNCONFIRMED のとき軽量再スキャン
- 通知（expo-notifications）
  - 重要なイベントをローカル通知（デバッグ時に有効）
- UI/UX（Tamagui）
  - Dashboard/Connection/Settings 画面
  - Pull-to-Refresh による軽量再同期
  - アクセシビリティ/タップ領域など調整済み

## 技術スタック

- Expo 54 / React Native 0.81 / React 19
- Expo Router 6（`app/` 直下ルーティング）
- TypeScript strict
- Tamagui UI
- BLE: `react-native-ble-plx`
- Background: `expo-location`, `expo-task-manager`, `react-native-background-fetch`
- 通知: `expo-notifications`

## ディレクトリ構成（抜粋）

- `app/` 画面ルート（`index.tsx` は `AttendancePage` を再エクスポート）
- `components/` UI 部品（atoms/molecules/organisms/templates/pages）
- `hooks/` BLE・ジオフェンス・通知・ユーザー ID などのフック
- `state/` 在室状態とユーザープロファイル（AsyncStorage）
- `tasks/` 背景タスク（ジオフェンス、定期チェック、INSIDE_AREA 通知）
- `bluetooth/` `bleManager` シングルトン
- `constants/` BLE/API 設定
- `openspec/` 仕様・変更提案（OpenSpec）

## 重要なアーキテクチャのポイント

- 共有 BLE 状態: `hooks/bleContext.tsx` の `BLEProvider` がグローバルで状態を共有。`useBLEContext()` で各画面が同一の接続情報/RSSI にアクセス。
- スキャン戦略: OS にはフィルターを渡さず（iOS で広告に UUID が出ないケースに対応）、JS で `BLE_SERVICE_UUIDS` と `BLE_DEVICE_NAME_PREFIXES` を判定。15s タイムアウトあり。
- Adopt 戦略: バックグラウンド接続や OS の状態復元をフォアグラウンドで即時採用。重複ログ/多重実行を避けるためロックとスロットルを実装。
- 状態遷移: 接続成功で `PRESENT`、切断で `INSIDE_AREA`（ジオフェンスで本当に外へ出たときだけ `OUTSIDE`）。`PRESENT -> INSIDE_AREA` に戻る際は INSIDE_AREA 通知をサーバーへ送信（後述の注意参照）。

## 前提条件

- Node.js 18+ / npm
- EAS CLI（Dev Client / ビルド用途）
- iOS/Android 実機 または BLE 対応エミュレータ（Android 推奨）
- Dev Client が必須（Expo Go では BLE や背景タスクが動作しません）

## 開発の始め方（ローカル）

1. 依存関係をインストール

- （任意）Windows PowerShell の場合は昇格権限不要

2. Dev Client をビルド（初回のみ）

- iOS: EAS の `development` プロファイルでビルドし TestFlight かローカルインストール
- Android: `development` プロファイルで内部配布しインストール

3. Dev Client で起動

- `expo start --dev-client` で QR を読み込み、Dev Client 上で起動

コマンド例（任意・参考）

- npm install
- npx eas build --profile development --platform ios
- npx eas build --profile development --platform android
- npx expo start --dev-client

> 注: 上記はドキュメントの参考コマンドです。環境に合わせて実行してください。

## TestFlight への配布

- `eas.json` の `production` プロファイルでビルド
- iOS: App Store Connect にアップロード後、TestFlight 配布
- 背景モード（Bluetooth, Location）とプライバシー文言は `app.json` に設定済み。審査向け説明（バックグラウンドでの用途）を用意してください。

コマンド例（任意・参考）

- npx eas build --profile production --platform ios
- npx eas submit --platform ios

## パーミッションと制限

- BLE は iOS/Android 共に「常時」位置情報や Bluetooth 権限が必要な場合があります。
- Expo Go では動作しません。必ず Dev Client または本番ビルドを使用。
- iOS の広告データにサービス UUID が出ないデバイスがあるため、スキャンは「フィルター無し + JS 判定」を採用。

## 環境設定

`constants/index.ts`

- `BLE_SERVICE_UUIDS` / `BLE_DEVICE_NAME_PREFIXES`
- `API_URL_ENTER` / `API_URL_EXIT` / `API_URL_INSIDE_AREA`
- `DEBUG_BLE`（デバッグ通知の抑制に使用）

ユーザー ID

- `Settings` 画面で設定。`state/userProfile.ts` に保存。

## 既知の注意点（InsideArea API 405）

現在、`PRESENT -> INSIDE_AREA` 遷移時に `tasks/insideAreaStatus.ts` から `API_URL_INSIDE_AREA` へ `POST` していますが、環境によっては `405 Method Not Allowed` が返ることがあります。

- 想定: `POST` JSON 形式 `{ userId, status: "INSIDE_AREA", timestamp, source, location? }`
- 対応: サーバー側のエンドポイント/メソッド/Content-Type 仕様をご確認ください。必要ならメソッドやパス、ペイロードを調整します。
- 一時回避: クライアント側で InsideArea 通知を無効化する場合は、`state/appState.ts` の該当呼び出しをコメントアウトしてください。

## トラブルシューティング

- スキャンが終わらない/見つからない
  - 端末の Bluetooth/位置情報を確認。アプリ権限が「常に許可」か確認。
  - `DEBUG_BLE` を有効にして通知ログを確認。
  - 15 秒タイムアウト後に Adopt が走るため、既存接続があるかも確認。
- RSSI が更新されない
  - 接続済みか確認。2s ポーリングで `connectedRssi` が更新されます。
- Dashboard と Connection の表示不一致
  - `BLEProvider` を経由して共有される想定です。Pull-to-Refresh で `refresh()` を呼び軽量再同期できます。
- バックグラウンドで動かない
  - Dev Client / 本番ビルドでのみ動作。OS 設定でアプリのバッテリー最適化除外を検討（Android）。

## 主要コードの入口

- 画面: `app/_layout.tsx`（`BLEProvider` をラップ） / `app/index.tsx`
- BLE: `hooks/useBLE.ts`（権限・スキャン・接続・RSSI・Adopt・disconnect）
- 状態: `state/appState.ts`（購読/INSIDE_AREA 通知） / `hooks/useAppState.ts`
- 背景: `hooks/useGeofencing.ts` / `tasks/geofencingTask.ts` / `tasks/periodicCheckTask.ts`
- INSIDE_AREA 通知: `tasks/insideAreaStatus.ts`

## 開発メモ

- コード変更後は `npm run lint` で型/規約チェック
- ルーティングは `app/` 直下のファイル名に従います（Expo Router）
- UI は `components/templates/MainTemplate` 系のテンプレートを踏襲
- 共有の `bleManager` は `bluetooth/bleManagerInstance.ts` から import（複数作成禁止）

---

この README の要件は `openspec/changes/add-readme-doc/specs/repo-docs/spec.md` に準拠しています。必要に応じて内容拡充していきます。
