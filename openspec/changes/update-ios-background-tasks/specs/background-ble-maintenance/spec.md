## ADDED Requirements

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

## MODIFIED Requirements

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
