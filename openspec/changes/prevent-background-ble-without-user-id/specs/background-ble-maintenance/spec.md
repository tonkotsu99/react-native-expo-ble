## MODIFIED Requirements

### Requirement: Periodic BLE Reconnect

背景タスクはジオフェンス内にいるが BLE が未接続の場合、定期的に BLE デバイスへの再接続を試みなければならない (SHALL)。接続/切断時にはローカル通知を送信しなければならない (SHALL)。

#### Scenario: Attempt reconnect when inside area

- **GIVEN** アプリ状態が `INSIDE_AREA` もしくは `UNCONFIRMED` であり、接続済みデバイスが存在しない
- **AND** 永続化されたユーザー ID が取得できる
- **WHEN** Background Fetch が実行される
- **THEN** タスクは BLE スキャンを開始し、対象デバイスを検出した場合は接続して `setAppState('PRESENT')` を呼び出さなければならない (SHALL)
- **AND** 接続成功時には入室 API (`API_URL_ENTER`) を呼び出して在室を報告しなければならない (SHALL)
- **AND** 接続成功時には「研究室デバイスに接続しました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Skip reconnect without user identifier

- **GIVEN** アプリ状態が `INSIDE_AREA` または `UNCONFIRMED` であり、永続化されたユーザー ID が取得できない
- **WHEN** バックグラウンドの BLE 再接続処理が起動する
- **THEN** タスクはスキャンや接続を開始せず、ユーザー ID が未設定である理由を警告ログに残して即座に終了しなければならない (SHALL)

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
