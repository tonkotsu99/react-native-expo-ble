## ADDED Requirements

### Requirement: Short-Term High Frequency Reconnect Window

ジオフェンス入場直後の短時間は、既存の 15 分周期より高頻度で BLE 再接続を試み、研究室への移動中でも早期に在室確定できるようにしなければならない (SHALL)。

#### Scenario: Schedule rapid retries on geofence enter

- **GIVEN** アプリ状態が `INSIDE_AREA` に遷移し、永続化されたユーザー ID が取得できる
- **WHEN** ジオフェンス入場イベントを受信する
- **THEN** システムは 30〜60 秒間隔の軽量スキャンを自動でスケジュールし、少なくとも 5 分間は再接続を試み続けなければならない (SHALL)

#### Scenario: Stop rapid retries after success or timeout

- **GIVEN** 高速再試行ウィンドウが実行中である
- **WHEN** BLE 接続が確立する、ジオフェンスを退出する、またはウィンドウ時間が経過する
- **THEN** システムは高速再試行スケジュールを停止し、既存の BackgroundFetch の 15 分周期にフォールバックしなければならない (SHALL)

#### Scenario: Skip rapid retries without user identifier

- **GIVEN** 永続化されたユーザー ID が取得できない
- **WHEN** 高速再試行ウィンドウを開始しようとする
- **THEN** システムは高速再試行を開始せず、ユーザー ID が未設定である旨を警告ログに残さなければならない (SHALL)
