## MODIFIED Requirements

### Requirement: Periodic BLE Reconnect → Periodic BLE Presence Detection

背景タスクは BLE GATT 接続を前提とせず、広告パケット検知のみで在室状態を判断しなければならない (SHALL)。複数端末が同時にビーコンを監視できるよう、接続確立は任意の最適化に留める。広告検知の有効期限 `presenceTtlMs` は 180000 (3 分) に設定する。

#### Scenario: Detect presence from advertisement

- **GIVEN** アプリ状態が `INSIDE_AREA` または `UNCONFIRMED` である
- **WHEN** ジオフェンスタスクまたは定期チェックが BLE スキャンを実行する
- **THEN** サービス UUID でフィルタされたローパワースキャンを開始し、広告パケットを検出した時点で `setAppState('PRESENT')` を呼び出さなければならない (SHALL)
- **AND** 接続を試行せずに「研究室デバイスを検出しました」という通知を送信しなければならない (SHALL)

#### Scenario: Post enter attendance once per presence session

- **GIVEN** 最新の広告検知から `presenceTtlMs = 180000` ms を超えていない
- **WHEN** 状態が `PRESENT` に遷移する
- **THEN** `API_URL_ENTER` にユーザー ID を含めた在室データを送信し、成功時に検知タイムスタンプを保存しなければならない (SHALL)
- **AND** 既に同一セッション内で送信済みの場合は追加送信してはならない (SHALL NOT)

#### Scenario: Downgrade when advertisements stop

- **GIVEN** 最後に広告を検知してから `presenceTtlMs = 180000` ms を超過した
- **WHEN** 次のスキャン完了時にも対象広告が検知できない
- **THEN** 状態を `UNCONFIRMED` に戻し、Reason ログを出力しなければならない (SHALL)
- **AND** 退出 API は呼び出さず、ジオフェンス退出イベントとの整合を保たなければならない (SHALL)

#### Scenario: Avoid exclusive BLE connection

- **WHEN** バックグラウンドタスクが広告検知をトリガーする
- **THEN** BLE デバイスへの `connect` / `discoverAllServicesAndCharacteristics` を呼び出してはならない (SHALL NOT)
- **AND** 必要に応じて追加の GATT 操作を行う場合は、ユーザー操作など前景シナリオに限定する (MAY)

#### Scenario: Exit geofence posts attendance

- **GIVEN** ジオフェンス退出イベントが発生した
- **THEN** タスクは `API_URL_EXIT` に退室データを POST し、`setAppState('OUTSIDE')` に更新したうえで Background Fetch を停止しなければならない (SHALL)
- **AND** 退出時には広告検知タイムスタンプをクリアし、次回入場時にセッションが再開されるようにしなければならない (SHALL)
