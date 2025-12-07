## ADDED Requirements

### Requirement: iOS iBeacon Region Monitoring

iOS では CoreLocation の iBeacon 領域監視 (CLBeaconRegion) を使用して、OS にビーコン入退室検知を委任しなければならない (SHALL)。ジオフェンス進入時にビーコン監視を開始し、ジオフェンス退出時に停止しなければならない (SHALL)。

#### Scenario: Start beacon monitoring on geofence enter

- **GIVEN** ユーザーがジオフェンス領域 (九工大エリア) に進入した
- **WHEN** `geofencingTask.ts` がジオフェンス ENTER イベントを処理する
- **THEN** iOS では `RNBeaconMonitoring.startMonitoring()` を呼び出し、研究室ビーコン (UUID/Major/Minor) の監視を OS に委任しなければならない (SHALL)
- **AND** Android ではこの処理をスキップしなければならない (SHALL)
- **AND** ビーコン監視開始の成功/失敗をログに記録しなければならない (SHALL)

#### Scenario: Beacon enter triggers presence state

- **GIVEN** iOS でビーコン領域監視が開始されている
- **WHEN** OS がビーコン ENTER を検知し、`beaconEnter` イベントを発火する
- **THEN** `geofencingTask.ts` は `setAppState('PRESENT')` を実行し、`API_URL_ENTER` に在室データを POST しなければならない (SHALL)
- **AND** 「研究室ビーコンに入室しました」というローカル通知を送信しなければならない (SHALL)
- **AND** ビーコン情報 (UUID, major, minor) をログに記録しなければならない (SHALL)

#### Scenario: Beacon exit triggers unconfirmed state

- **GIVEN** iOS でビーコン PRESENT 状態にある
- **WHEN** OS がビーコン EXIT を検知し、`beaconExit` イベントを発火する
- **THEN** `geofencingTask.ts` は 3 分間の TTL バッファを設けた後、`setAppState('UNCONFIRMED')` を実行しなければならない (SHALL)
- **AND** 「研究室ビーコンから退出しました」というローカル通知を送信しなければならない (SHALL)
- **AND** 頻繁な出入りでの状態フラップを防ぐため、3 分以内に再 ENTER した場合は PRESENT を維持しなければならない (SHALL)

#### Scenario: Stop beacon monitoring on geofence exit

- **GIVEN** iOS でビーコン領域監視が開始されている
- **WHEN** ユーザーがジオフェンス領域 (九工大エリア) から退出する
- **THEN** `geofencingTask.ts` は `RNBeaconMonitoring.stopMonitoring()` を呼び出し、ビーコン監視を停止しなければならない (SHALL)
- **AND** `setAppState('OUTSIDE')` と `API_URL_EXIT` への POST を実行しなければならない (SHALL)
- **AND** ビーコン監視停止をログに記録しなければならない (SHALL)

#### Scenario: Beacon monitoring requires location permissions

- **GIVEN** iOS でビーコン監視を開始しようとする
- **WHEN** 位置情報権限 (Always) が許可されていない
- **THEN** `RNBeaconMonitoring.startMonitoring()` は Promise を reject し、エラーメッセージを返さなければならない (SHALL)
- **AND** `geofencingTask.ts` はエラーをキャッチして警告ログを記録し、通常の広告スキャンフローにフォールバックしなければならない (SHALL)

#### Scenario: Native module emits beacon events

- **GIVEN** `RNBeaconMonitoring.swift` でビーコン領域監視が開始されている
- **WHEN** `CLLocationManager` の `didEnterRegion` または `didExitRegion` が呼び出される
- **THEN** ネイティブモジュールは `NativeEventEmitter` を通じて `beaconEnter` または `beaconExit` イベントを React Native 側に送信しなければならない (SHALL)
- **AND** イベントペイロードには `uuid`, `major`, `minor`, `timestamp` が含まれなければならない (SHALL)

## MODIFIED Requirements

### Requirement: Periodic BLE Reconnect

背景タスクはジオフェンス内にいるが BLE が未接続の場合、定期的に BLE デバイスへの再接続を試みなければならない (SHALL)。**iOS ではビーコン領域監視に委任するため、定期スキャンをスキップしなければならない (SHALL)**。Android では引き続き定期スキャンを実行しなければならない (SHALL)。

#### Scenario: iOS skips periodic scan when beacon monitoring active

- **GIVEN** iOS でビーコン領域監視が開始されている
- **WHEN** `periodicCheckTask.ts` が Background Fetch で実行される
- **THEN** タスクは `Platform.OS === 'ios'` をチェックし、iOS では BLE スキャンをスキップしなければならない (SHALL)
- **AND** スキップ理由をログに記録しなければならない (SHALL)
- **AND** Android では従来通り BLE スキャンを実行しなければならない (SHALL)

#### Scenario: Android continues periodic reconnect

- **GIVEN** Android でアプリ状態が `INSIDE_AREA` または `UNCONFIRMED` である
- **WHEN** `periodicCheckTask.ts` が Background Fetch で実行される
- **THEN** 既存の BLE スキャンロジックを実行し、デバイス検出時に `setAppState('PRESENT')` を呼び出さなければならない (SHALL)
- **AND** iOS ではこの処理をスキップしなければならない (SHALL)

#### Scenario: Fallback scan on beacon monitoring failure

- **GIVEN** iOS でビーコン監視開始が失敗した (権限不足など)
- **WHEN** `periodicCheckTask.ts` が実行される
- **THEN** iOS でもフォールバックとして 60 分間隔の BLE スキャンを実行しなければならない (SHALL)
- **AND** フォールバックモードであることをログと通知で明示しなければならない (SHALL)
