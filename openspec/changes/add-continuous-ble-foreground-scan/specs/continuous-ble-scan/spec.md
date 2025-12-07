# Continuous BLE Scan Specification

## Purpose

Android でジオフェンス内にいる間、フォアグラウンドサービスを起動して BLE ビーコンを常時スキャンし、RSSI 値に基づいて研究室の入退室を判定する。

## ADDED Requirements

### Requirement: Start Continuous Scan on Geofence Enter (Android)

Android でジオフェンス ENTER イベント発生時、フォアグラウンドサービスを起動し、BLE の常時スキャンを開始しなければならない (SHALL)。

#### Scenario: Geofence enter starts foreground service

- **GIVEN** Android デバイスがジオフェンス領域に入る
- **WHEN** `geofencingTask.ts` の ENTER イベントが処理される
- **THEN** `startAndroidBleForegroundService("continuous-scan")` を呼び出して、通知を表示しなければならない (SHALL)
- **AND** 通知のタイトルは「研究室ビーコンを監視しています」、本文は「学内にいる間、バックグラウンドでビーコンを検出します」でなければならない (SHALL)
- **AND** フォアグラウンドサービス通知は sticky (常駐) かつ autoDismiss=false でなければならない (SHALL)

#### Scenario: Continuous scan starts without stopping

- **GIVEN** フォアグラウンドサービスが起動している
- **WHEN** `startContinuousBleScanner()` が呼び出される
- **THEN** `bleManager.startDeviceScan(BLE_SERVICE_UUIDS, null, callback)` を実行しなければならない (SHALL)
- **AND** スキャン完了後も `stopDeviceScan()` を呼び出さず、常時スキャンを継続しなければならない (SHALL)
- **AND** グローバルフラグ `isContinuousScanActive = true` を設定しなければならない (SHALL)

### Requirement: RSSI-based State Transition

BLE ビーコンの RSSI 値を監視し、しきい値に基づいて状態を遷移させなければならない (SHALL)。

#### Scenario: Strong RSSI transitions to PRESENT

- **GIVEN** 常時スキャンが有効で、アプリ状態が `INSIDE_AREA` または `UNCONFIRMED`
- **WHEN** ビーコンの RSSI が `-70 dBm` を超える値で検出される
- **THEN** `setAppState("PRESENT")` を呼び出さなければならない (SHALL)
- **AND** 初回遷移時に `API_URL_ENTER` へ出席データを POST しなければならない (SHALL)
- **AND** 「研究室デバイスに接続しました」通知を送信しなければならない (SHALL)
- **AND** `UNCONFIRMED` タイマーが動作中の場合、クリアしなければならない (SHALL)

#### Scenario: Weak RSSI transitions to UNCONFIRMED

- **GIVEN** アプリ状態が `PRESENT`
- **WHEN** ビーコンの RSSI が `-75 dBm` 以下で検出される、またはビーコンが検出されない
- **THEN** `setAppState("UNCONFIRMED")` を呼び出さなければならない (SHALL)
- **AND** 3 分間の猶予タイマーを開始しなければならない (SHALL)
- **AND** 猶予期間中に RSSI が回復した場合、タイマーをクリアして `PRESENT` に復帰しなければならない (SHALL)

#### Scenario: Unconfirmed timeout transitions to INSIDE_AREA

- **GIVEN** アプリ状態が `UNCONFIRMED` で、3 分間の猶予タイマーが動作中
- **WHEN** 3 分間経過してもビーコンが検出されない、または RSSI が弱いまま
- **THEN** `setAppState("INSIDE_AREA")` を呼び出さなければならない (SHALL)
- **AND** 「研究室デバイスから切断されました」通知を送信しなければならない (SHALL)

### Requirement: Stop Continuous Scan on Geofence Exit (Android)

Android でジオフェンス EXIT イベント発生時、BLE スキャンを停止し、フォアグラウンドサービスを終了しなければならない (SHALL)。

#### Scenario: Geofence exit stops continuous scan

- **GIVEN** 常時スキャンが有効でフォアグラウンドサービスが動作中
- **WHEN** ジオフェンス EXIT イベントが処理される
- **THEN** `bleManager.stopDeviceScan()` を呼び出してスキャンを停止しなければならない (SHALL)
- **AND** `isContinuousScanActive = false` を設定しなければならない (SHALL)
- **AND** `UNCONFIRMED` タイマーが動作中の場合、クリアしなければならない (SHALL)

#### Scenario: Foreground service stops on geofence exit

- **GIVEN** フォアグラウンドサービスが動作中
- **WHEN** ジオフェンス EXIT イベントが処理される
- **THEN** `stopAndroidBleForegroundService("geofence-exit")` を呼び出さなければならない (SHALL)
- **AND** フォアグラウンド通知が消去されなければならない (SHALL)

### Requirement: RSSI Threshold Configuration

RSSI しきい値は定数として定義し、調整可能でなければならない (SHALL)。

#### Scenario: RSSI thresholds are configurable

- **WHEN** `constants/index.ts` を参照する
- **THEN** `RSSI_ENTER_THRESHOLD = -70` が定義されていなければならない (SHALL)
- **AND** `RSSI_EXIT_THRESHOLD = -75` が定義されていなければならない (SHALL)
- **AND** `RSSI_DEBOUNCE_TIME_MS = 3 * 60 * 1000` (3 分) が定義されていなければならない (SHALL)

### Requirement: Prevent Duplicate Scans

常時スキャンが有効な場合、定期タスクは BLE スキャンをスキップしなければならない (SHALL)。

#### Scenario: Periodic task skips scan when continuous scan is active

- **GIVEN** `isContinuousScanActive === true`
- **WHEN** `periodicCheckTask.ts` が実行される
- **THEN** BLE スキャンをスキップし、ログに「Continuous scan active. Skipping periodic scan.」を記録しなければならない (SHALL)
- **AND** `BackgroundFetch.finish(taskId)` を呼び出してタスクを終了しなければならない (SHALL)

### Requirement: iOS maintains periodic scan

iOS では既存の定期スキャン（15 分間隔）を維持し、常時スキャンは適用しなければならない (SHALL)。

#### Scenario: iOS continues using periodic scan

- **GIVEN** プラットフォームが iOS
- **WHEN** ジオフェンス ENTER イベントが処理される
- **THEN** フォアグラウンドサービスを起動してはならない (SHALL NOT)
- **AND** 既存の `tryDetectBeacon()` による定期スキャンを継続しなければならない (SHALL)
- **AND** `isContinuousScanActive` フラグは `false` のまま維持されなければならない (SHALL)
