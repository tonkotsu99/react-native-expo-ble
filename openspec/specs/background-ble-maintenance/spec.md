# background-ble-maintenance Specification

## Purpose

TBD - created by archiving change add-periodic-ble-rescan. Update Purpose after archive.

## Requirements

### Requirement: iOS Background Fetch Capability

iOS でバックグラウンド再接続を行うため、アプリは適切なバックグラウンドモードを宣言し、スケジューラを初期化しなければならない (SHALL)。

#### Scenario: Declare fetch/processing modes

- **WHEN** iOS ビルドを作成する
- **THEN** Info.plist の `UIBackgroundModes` に `fetch` と `processing` を含めなければならない (SHALL)
- **AND** BackgroundFetch の初期化は `minimumFetchInterval = 15` 分、`stopOnTerminate=false`, `startOnBoot=true` で行われる

#### Scenario: Start BackgroundFetch on geofence enter

- **GIVEN** ジオフェンス入場で状態が `INSIDE_AREA` に遷移した
- **WHEN** タスク初期化が完了する
- **THEN** `BackgroundFetch.start()` を一度だけ呼び出し、以降の周期実行で BLE 再接続を試みなければならない (SHALL)

### Requirement: BLE Manager State Restoration (iOS)

iOS のバックグラウンド制約下で BLE を継続利用するため、BleManager は State Restoration を構成しなければならない (SHALL)。

#### Scenario: Provide restore identifiers

- **WHEN** BleManager を初期化する
- **THEN** `restoreStateIdentifier` と `restoreStateFunction` を指定しなければならない (SHALL)
- **AND** 復元時にログを記録し、必要に応じて接続状態の再検査を行う

#### Scenario: Declare bluetooth-central mode

- **WHEN** iOS ビルドを作成する
- **THEN** Info.plist の `UIBackgroundModes` に `bluetooth-central` を含めなければならない (SHALL)
- **AND** スキャンはサービス UUID でフィルタリングし、不要な消費電力を避ける

### Requirement: Periodic BLE Reconnect

背景タスクはジオフェンス内にいるが BLE が未接続の場合、定期的に BLE デバイスへの再接続を試みなければならない (SHALL)。接続/切断時にはローカル通知を送信しなければならない (SHALL)。

#### Scenario: Attempt reconnect when inside area

- **GIVEN** アプリ状態が `INSIDE_AREA` もしくは `UNCONFIRMED` であり、接続済みデバイスが存在しない
- **WHEN** Background Fetch が実行される
- **THEN** タスクは BLE スキャンを開始し、対象デバイスを検出した場合は接続して `setAppState('PRESENT')` を呼び出さなければならない (SHALL)
- **AND** 接続成功時には入室 API (`API_URL_ENTER`) を呼び出して在室を報告しなければならない (SHALL)
- **AND** 接続成功時には「研究室デバイスに接続しました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Stop scan when device not found

- **GIVEN** スキャン開始から一定時間デバイスが検出できない
- **THEN** タスクはスキャンを停止し、状態を `UNCONFIRMED` のまま維持する旨をログに記録しなければならない (SHALL)

#### Scenario: Respect existing connection

- **GIVEN** 接続済みデバイスがすでに検出されている
- **THEN** タスクはスキャンを開始せず、状態を `PRESENT` に更新するだけで完了しなければならない (SHALL)

#### Scenario: Exit geofence posts attendance

- **GIVEN** ジオフェンス退出イベントが発生した
- **THEN** タスクは `API_URL_EXIT` に退室データを POST し、`setAppState('OUTSIDE')` を更新したうえで Background Fetch を停止しなければならない (SHALL)
- **AND** 通信エラー時には失敗ログを出力し、次回イベントでリトライできるようにしなければならない (SHALL)
- **AND** 退出時には「九工大エリアを出ました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Attendance APIs use persisted user identifier

- **WHEN** バックグラウンドタスクが入室または退室 API を呼び出す
- **THEN** タスクは永続化されたユーザー ID を取得してペイロードに含めなければならない (SHALL)
- **AND** ユーザー ID が取得できない場合は API 呼び出しをスキップし、ログに警告を残さなければならない (SHALL)

### Requirement: Cross-Platform BLE Permissions

バックグラウンド BLE 処理は、iOS/Android 両プラットフォームで適切な権限管理を実行しなければならない (SHALL)。権限不足によるスキャン失敗時には適切なログ記録を行わなければならない (SHALL)。

#### Scenario: iOS background BLE permissions

- **GIVEN** バックグラウンドタスクが iOS で BLE スキャンを実行する
- **WHEN** 権限チェックが実行される
- **THEN** iOS 固有の Bluetooth 権限状態を確認しなければならない (SHALL)
- **AND** Info.plist に `NSBluetoothAlwaysUsageDescription` が定義され、`UIBackgroundModes` に `bluetooth-central` と `location` が含まれていることを前提とする
- **AND** 権限不足の場合はスキャンをスキップし、警告ログを記録しなければならない (SHALL)

#### Scenario: Handle iOS Bluetooth state changes

- **GIVEN** iOS で Bluetooth がシステム設定で無効化される
- **WHEN** バックグラウンド BLE タスクが実行される
- **THEN** タスクは Bluetooth 状態を確認してスキャンを適切にスキップしなければならない (SHALL)
- **AND** Bluetooth 無効状態のログ記録を行わなければならない (SHALL)

### Requirement: Geofence Event Notifications

ジオフェンス入退出イベント発生時には、ユーザーにローカル通知を送信しなければならない (SHALL)。

#### Scenario: Geofence enter sends notification

- **GIVEN** ユーザーがジオフェンス領域に入る
- **WHEN** `geofencingTask.ts` がジオフェンス入場イベントを処理する
- **THEN** 「九工大エリアに入りました」というローカル通知を送信しなければならない (SHALL)
- **AND** 通知はバックグラウンドでもフォアグラウンドでも表示される

#### Scenario: BLE disconnection sends notification

- **GIVEN** BLE デバイスとの接続が切断される
- **WHEN** `useBLE.ts` の `device.onDisconnected` コールバックが実行される
- **THEN** 「研究室デバイスから切断されました」というローカル通知を送信しなければならない (SHALL)
- **AND** デバイス名が通知本文に含まれる
