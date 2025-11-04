## ADDED Requirements

### Requirement: iOS Background Entry Connect Recovery

iOS でアプリがバックグラウンドもしくは終了状態にあるときでも、ジオフェンス入場イベントを受け取ったら BLE 接続フローを直ちに起動し、Bluetooth の電源状態が復帰するまで待機してからスキャン・接続を完了させなければならない (SHALL)。

#### Scenario: Await powered state before scanning

- **GIVEN** ジオフェンス入場イベントがバックグラウンドで処理され、`BleManager.state()` が `PoweredOff` または `Unknown` を返している
- **WHEN** 接続フローを開始する
- **THEN** システムは `PoweredOn` になるまで `BleManager.onStateChange` などを用いて待機し、その後にスキャンを開始しなければならない (SHALL)

#### Scenario: Record diagnostics for each entry attempt

- **WHEN** バックグラウンドでの入場接続フローを起動する
- **THEN** システムは開始/完了/失敗をログに残し、デバッグ通知または同等のテレメトリで現在の状態と直近の Bluetooth ステータスを記録しなければならない (SHALL)

#### Scenario: Escalate to rapid retry when first attempt fails

- **GIVEN** iOS バックグラウンドでの初回スキャンが対象デバイスを検出できなかった
- **WHEN** 接続フローが 1 回目の試行で失敗する
- **THEN** システムは高速再試行ウィンドウを開始し、ウィンドウ継続中は 30〜60 秒間隔で再接続を継続して試みなければならない (SHALL)
