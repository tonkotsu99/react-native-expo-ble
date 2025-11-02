## MODIFIED Requirements

### Requirement: Periodic BLE Reconnect

ジオフェンス滞在中に BLE 接続が失われた場合、バックグラウンド処理は再入場や滞在継続中でも再接続を継続的に試みなければならない (SHALL)。一度の失敗でリトライを停止してはならない (SHALL NOT)。

#### Scenario: Re-enter area triggers immediate rescan

- **GIVEN** アプリ状態が `INSIDE_AREA` に戻っており BLE が未接続である
- **WHEN** ジオフェンス入場イベントが再度発火する、または BackgroundFetch が起動する
- **THEN** バックグラウンドタスクは BLE スキャンと接続リトライを直ちに実行しなければならない (SHALL)
- **AND** 接続成功まで一定間隔で再試行し、成功時には `setAppState('PRESENT')` と入室 API 送信、接続通知を行わなければならない (SHALL)
