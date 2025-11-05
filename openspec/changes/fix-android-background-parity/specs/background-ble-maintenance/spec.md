## MODIFIED Requirements

### Requirement: Periodic BLE Reconnect

バックグラウンドタスクは在室状態を維持するため、プラットフォーム固有の挙動を考慮しつつ BLE デバイスへの再接続を継続的に試みなければならない (SHALL)。

#### Scenario: Attempt reconnect when inside area (MODIFIED)

- **GIVEN** アプリ状態が `INSIDE_AREA`, `UNCONFIRMED`, または `PRESENT` であり、接続済みデバイスが存在しない
- **AND** プラットフォームが Android の場合、バックグラウンド実行中はフォアグラウンドサービス通知が表示されている
- **WHEN** Background Fetch またはジオフェンス再入場によって再スキャンが開始される
- **THEN** タスクは OS 制限に合わせたフォアグラウンドサービスを開始したうえで BLE スキャンを実行し、対象デバイスを検出した場合は `autoConnect=true` で接続を試み、`setAppState('PRESENT')` を更新しなければならない (SHALL)
- **AND** 接続成功時には入室 API (`API_URL_ENTER`) を呼び出し、ローカル通知とデバッグログを Android でも送信しなければならない (SHALL)
- **AND** スキャンが失敗またはタイムアウトした場合はフォアグラウンドサービスを停止し、ログに理由を残したうえで指数バックオフを適用しなければならない (SHALL)

#### Scenario: Respect existing connection (MODIFIED)

- **GIVEN** 接続済みデバイスがすでに検出されている
- **WHEN** プラットフォームが Android でバックグラウンド状態にある
- **THEN** タスクはスキャンを開始せず、フォアグラウンドサービスを即座に停止し、状態を `PRESENT` に更新するだけで完了しなければならない (SHALL)

### Requirement: Cross-Platform BLE Permissions (MODIFIED)

バックグラウンド BLE 機能は iOS/Android の権限と電源管理要件を満たし、ユーザーに必要な許可を促さなければならない (SHALL)。

#### Scenario: Android background BLE permissions (ADDED)

- **GIVEN** Android 13 以上の端末でバックグラウンド BLE タスクまたは通知を利用する
- **WHEN** 初回のバックグラウンド処理が開始される
- **THEN** アプリは `POST_NOTIFICATIONS` と Battery Optimization 例外 (`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) を確認し、未許可の場合はユーザーに許可ダイアログまたは設定画面への誘導を提示しなければならない (SHALL)
- **AND** 権限が得られない場合はログ／デバッグ通知で背景処理が無効化される旨を記録し、フォアグラウンドサービスを起動しない (SHALL)

## ADDED Requirements

### Requirement: Android Background BLE Continuity

Android ビルドでも iOS と同等のバックグラウンド在室検知を保証するため、ジオフェンス・定期チェック・通知を含む BLE フローを完遂しなければならない (SHALL)。

#### Scenario: Geofence enter while app backgrounded

- **GIVEN** Android 端末でアプリがバックグラウンドまたは終了状態にあり、ジオフェンス入場イベントが発生した
- **WHEN** `geofencingTask` がイベントを受信する
- **THEN** タスクはフォアグラウンドサービス通知を開始し、ユーザー ID が存在する場合は 60 秒以内に BLE スキャンと `autoConnect` 付き接続を 1 回以上試みなければならない (SHALL)
- **AND** 接続成功時には `setAppState('PRESENT')`、`API_URL_ENTER` への POST、および接続通知を送信する (SHALL)
- **AND** 接続に失敗した場合は Rapid Retry ウィンドウを Android でもスケジュールし、失敗理由と次回実行予定をログ・通知に記録する (SHALL)

#### Scenario: Geofence exit while app backgrounded

- **GIVEN** Android 端末でアプリがバックグラウンドにあり、ジオフェンス退出イベントが発生した
- **WHEN** `geofencingTask` が退出を処理する
- **THEN** タスクは接続中のデバイスを切断し、`API_URL_EXIT` を呼び出し、`setAppState('OUTSIDE')` を更新し、退出通知を送信しなければならない (SHALL)
- **AND** タスク完了後はフォアグラウンドサービスを停止し、Rapid Retry ウィンドウを解除する (SHALL)

#### Scenario: Periodic check under Doze

- **GIVEN** Android 端末が Doze もしくはアプリ節電対象になっている
- **WHEN** `periodicCheckTask` が呼び出されるか、または呼び出されない場合のステータスを取得した
- **THEN** アプリは `BackgroundFetch.status` を監視し、スケジューラが停止している場合は設定画面への誘導と再スケジュールを試み、ログに結果を残さなければならない (SHALL)
- **AND** タスクが実行された際はフォアグラウンドサービスを利用して BLE スキャンを行い、接続成功／失敗の通知を Android でも送信する (SHALL)

#### Scenario: Debug observability on Android

- **GIVEN** Android 端末でバックグラウンド処理が実行される
- **WHEN** デバッグモード (`DEBUG_BLE`) が有効
- **THEN** `sendDebugNotification` を通じてフォアグラウンドサービス状態・権限チェック結果・接続成否を含む通知が表示され、Logcat に同等の情報が出力されなければならない (SHALL)
