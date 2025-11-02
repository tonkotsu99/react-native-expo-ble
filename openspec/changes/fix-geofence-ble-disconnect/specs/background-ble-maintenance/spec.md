## MODIFIED Requirements

### Requirement: Periodic BLE Reconnect

バックグラウンドで確立した BLE 接続は、切断イベントを監視して状態を適切に更新しなければならない (SHALL)。監視が動作しない場合に接続を放置してはならない (SHALL NOT)。

#### Scenario: Background geofence connections monitor disconnects

- **GIVEN** `geofencingTask` が BLE デバイスにバックグラウンドで接続し `setAppState('PRESENT')` を完了した
- **WHEN** ビーコンの信号が途切れる、またはデバイスが範囲外に移動して接続が切断される
- **THEN** バックグラウンド接続フローは `device.onDisconnected` などを通じて切断イベントを検知しなければならない (SHALL)
- **AND** アプリ状態を `INSIDE_AREA` へ戻し、必要に応じて BLE 切断通知を送信しなければならない (SHALL)
- **AND** 接続監視はタイマー／RSSI チェックを含めて多重起動せず、離脱時に確実にリソースを解放しなければならない (SHALL)
