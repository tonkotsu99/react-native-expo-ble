## Context

LINBLEZ-2 は 1 台のセントラルとしか GATT 接続を維持できないため、現在の「接続完了で在室確定」というワークフローは複数端末の在室管理に適合しない。接続開始と同時に他端末が拒否され、`UNCONFIRMED` 状態が長時間継続したままになる。また、BackgroundFetch が 15 分周期でしか動作しないケースでは、接続待ちの端末から在室 API が送信できず、入室ログに欠損が生じる。

## Proposed Approach

1. **広告ベース Presence TTL**: BLE スキャン結果から対象サービス UUID の広告が検知された時刻を `presenceLastSeen` として記録し、`presenceTtlMs = 180000` を超えるまでは `PRESENT` を維持する。TTL は AsyncStorage に保存し、バックグラウンドタスクと前景フックで共有する。
2. **Non-exclusive Scanning**: `react-native-ble-plx` の `startDeviceScan` をローパワー設定で実行し、検知時点でスキャンを停止する。GATT 接続 API (`connect`, `discoverAllServicesAndCharacteristics`) は呼び出さず、ビーコンは複数端末と同時に共有できる。
3. **Idempotent Attendance Posting**: `presenceLastSeen` が TTL を超えてリセットされた場合のみ、次回の `PRESENT` 遷移で `/attendance/enter` を再送する。これにより複数端末が同じ広告を検知しても重複送信を防げる。
4. **Graceful Downgrade**: TTL 超過後の最初のスキャン完了で `UNCONFIRMED` へ戻し、追加ログを出力する。退出 API は引き続きジオフェンス退出イベントからのみ発火し、BLE 未検知だけで退室扱いにはしない。
5. **UX Alignment**: 通知・UI 文言を「ビーコン検出」を基準に更新し、従来の「接続しました」表現を置き換える。必要に応じて接続ベースの演出は手動操作時だけに限定する。

## Alternatives Considered

- **GATT 接続の負荷分散**: 接続解除のタイミングを短縮して端末間で順番に接続し直す案は、切断 → 再接続の遅延と API 連携の競合を招くため却下。
- **複数ビーコン配備**: 物理デバイスを追加するのは設備コストが高く、アプリ側で広告検知に切り替えれば解決できるため今回は採用しない。
- **サーバー側重複排除**: API で重複 POST を受け入れて整理する案は、ネットワーク負荷と状態遷移の遅延を拡大するため、クライアントでセッション制御する方針を優先する。

## Risks & Mitigations

- **広告未検知の false negative**: 省電力設定で広告を取りこぼす可能性がある。Rapid Retry ウィンドウと TTL 3 分の併用で再検知のチャンスを確保し、ログから閾値調整を可能にする。
- **複数端末の同時 API 送信**: TTL を超えたセッションのみで再送し、送信時刻を AsyncStorage に保存することで多重送信を抑制する。
- **バッテリー消費**: 常時スキャンを避け、背景タスク内で一定時間以内に検知できた時点でスキャンを終了する。必要に応じて RSSI 弱い検知には再試行を追加する余地を残す。
