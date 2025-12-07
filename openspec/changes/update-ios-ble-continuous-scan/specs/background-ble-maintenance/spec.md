# background-ble-maintenance Spec Delta

## Purpose

iOS でも Android と同様に、ジオフェンス内で RSSI ベースの連続 BLE スキャンを実行し、研究室内/廊下の正確な判定を実現します。

## MODIFIED Requirements

### Requirement: Periodic BLE Reconnect

**変更理由**: iOS でも連続スキャンを優先し、定期タスクはフォールバック専用にする

背景タスクはジオフェンス内にいるが BLE が未接続の場合、定期的に BLE デバイスへの再接続を試みなければならない (SHALL)。接続/切断時にはローカル通知を送信しなければならない (SHALL)。**両 OS で連続スキャンが実行中の場合、定期タスクはスキップしなければならない (SHALL)**。

#### Scenario: Attempt reconnect when inside area

- **GIVEN** アプリ状態が `INSIDE_AREA` もしくは `UNCONFIRMED` であり、接続済みデバイスが存在しない
- **AND** 連続スキャンが実行中でない (`isContinuousScanActive === false`)
- **WHEN** Background Fetch が実行される
- **THEN** タスクは BLE スキャンを開始し、対象デバイスを検出した場合は接続して `setAppState('PRESENT')` を呼び出さなければならない (SHALL)
- **AND** 接続成功時には入室 API (`API_URL_ENTER`) を呼び出して在室を報告しなければならない (SHALL)
- **AND** 接続成功時には「研究室デバイスに接続しました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Skip reconnect when continuous scan is active

- **GIVEN** 連続スキャンが実行中 (`isContinuousScanActive === true`)
- **WHEN** Background Fetch が実行される
- **THEN** タスクは BLE スキャンをスキップし、`BackgroundFetch.finish(taskId)` を即座に呼び出さなければならない (SHALL)
- **AND** スキップ理由をログに記録しなければならない (SHALL)

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

### Requirement: iOS Background Fetch Capability

**変更理由**: iOS でも連続スキャンを優先し、定期タスクの役割を明確化

iOS でバックグラウンド再接続を行うため、アプリは適切なバックグラウンドモードを宣言し、スケジューラを初期化しなければならない (SHALL)。**定期タスクは連続スキャンのフォールバックとして機能しなければならない (SHALL)**。

#### Scenario: Declare fetch/processing modes

- **WHEN** iOS ビルドを作成する
- **THEN** Info.plist の `UIBackgroundModes` に `fetch` と `processing` を含めなければならない (SHALL)
- **AND** BackgroundFetch の初期化は `minimumFetchInterval = 15` 分、`stopOnTerminate=false`, `startOnBoot=true` で行われる

#### Scenario: Start BackgroundFetch on geofence enter

- **GIVEN** ジオフェンス入場で状態が `INSIDE_AREA` に遷移した
- **WHEN** タスク初期化が完了する
- **THEN** `BackgroundFetch.start()` を一度だけ呼び出し、以降の周期実行で BLE 再接続を試みなければならない (SHALL)

## ADDED Requirements

### Requirement: iOS Continuous BLE Scan

iOS でも Android と同様に、ジオフェンス内で RSSI ベースの連続 BLE スキャンを実行しなければならない (SHALL)。iOS は State Restoration を使用してバックグラウンドスキャンを継続し、フォアグラウンドサービス通知は表示しなければならない (SHALL NOT)。

#### Scenario: Start continuous scan on geofence enter (iOS)

- **GIVEN** iOS デバイスでジオフェンス ENTER イベントが発生した
- **WHEN** ジオフェンスタスクが実行される
- **THEN** `startContinuousBleScanner()` を呼び出さなければならない (SHALL)
- **AND** フォアグラウンドサービス通知を表示してはならない (SHALL NOT)
- **AND** `isContinuousScanActive` フラグを `true` に設定しなければならない (SHALL)

#### Scenario: RSSI-based state transitions (iOS)

- **GIVEN** iOS で連続スキャンが実行中
- **WHEN** ビーコンの RSSI が `-70 dBm` を超える
- **THEN** アプリ状態を `PRESENT` に遷移しなければならない (SHALL)
- **AND** 入室 API (`API_URL_ENTER`) を呼び出さなければならない (SHALL)
- **AND** 「研究室デバイスに接続しました」通知を送信しなければならない (SHALL)

- **WHEN** ビーコンの RSSI が `-75 dBm` 以下になる
- **THEN** アプリ状態を `UNCONFIRMED` に遷移しなければならない (SHALL)
- **AND** 3 分間のデバウンスタイマーを開始しなければならない (SHALL)

- **WHEN** デバウンスタイマーが満了する
- **THEN** アプリ状態を `INSIDE_AREA` に遷移しなければならない (SHALL)
- **AND** 「研究室デバイスから切断されました」通知を送信しなければならない (SHALL)

#### Scenario: Stop continuous scan on geofence exit (iOS)

- **GIVEN** iOS でジオフェンス EXIT イベントが発生した
- **WHEN** ジオフェンスタスクが実行される
- **THEN** `stopContinuousBleScanner()` を呼び出さなければならない (SHALL)
- **AND** `isContinuousScanActive` フラグを `false` に設定しなければならない (SHALL)
- **AND** デバウンスタイマーをクリアしなければならない (SHALL)

#### Scenario: iOS State Restoration for background scan

- **GIVEN** iOS アプリがバックグラウンドに移行した
- **WHEN** 連続スキャンが実行中
- **THEN** `BleManager` の `restoreStateIdentifier` により、iOS がスキャンを継続しなければならない (SHALL)
- **AND** サービス UUID `27adc9ca-35eb-465a-9154-b8ff9076f3e8` を検出した際、iOS がアプリをウェイクアップしなければならない (SHALL)

#### Scenario: Fallback to periodic task when scan stops

- **GIVEN** iOS で連続スキャンが何らかの理由で停止した (例: アプリの完全サスペンド)
- **WHEN** 定期タスク (15 分間隔) が実行される
- **THEN** 定期タスクは連続スキャンが停止していることを検知し、スキャンを再開しなければならない (SHALL)
- **AND** `isContinuousScanActive` フラグを `true` に更新しなければならない (SHALL)

## REMOVED Requirements

なし (既存要件は保持し、MODIFIED で拡張)
