## ADDED Requirements

### Requirement: Periodic BLE Reconnect

背景タスクはジオフェンス内にいるが BLE が未接続の場合、定期的に BLE デバイスへの再接続を試みなければならない (SHALL)。

#### Scenario: Attempt reconnect when inside area

- **GIVEN** アプリ状態が `INSIDE_AREA` もしくは `UNCONFIRMED` であり、接続済みデバイスが存在しない
- **WHEN** Background Fetch が実行される
- **THEN** タスクは BLE スキャンを開始し、対象デバイスを検出した場合は接続して `setAppState('PRESENT')` を呼び出さなければならない (SHALL)
- **AND** 接続成功時には入室 API (`API_URL_ENTER`) を呼び出して在室を報告しなければならない (SHALL)

#### Scenario: Stop scan when device not found

- **GIVEN** スキャン開始から一定時間デバイスが検出できない
- **THEN** タスクはスキャンを停止し、状態を `UNCONFIRMED` のまま維持する旨をログに記録しなければならない (SHALL)

#### Scenario: Respect existing connection

- **GIVEN** 接続済みデバイスがすでに検出されている
- **THEN** タスクはスキャンを開始せず、状態を `PRESENT` に更新するだけで完了しなければならない (SHALL)
