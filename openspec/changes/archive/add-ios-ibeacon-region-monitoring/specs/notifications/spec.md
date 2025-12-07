## ADDED Requirements

### Requirement: Beacon Enter/Exit Notifications

iOS でビーコン領域への入退室が検知された際、ユーザーにローカル通知を送信しなければならない (SHALL)。

#### Scenario: Beacon enter notification

- **GIVEN** iOS でビーコン ENTER イベントが発火した
- **WHEN** `geofencingTask.ts` がイベントを処理する
- **THEN** 「研究室ビーコンに入室しました」というローカル通知を送信しなければならない (SHALL)
- **AND** 通知タイトルは「研究室」、本文にはビーコン名またはデバイス ID を含めなければならない (SHALL)
- **AND** 通知はバックグラウンドでもフォアグラウンドでも表示されなければならない (SHALL)

#### Scenario: Beacon exit notification

- **GIVEN** iOS でビーコン EXIT イベントが発火した
- **WHEN** `geofencingTask.ts` がイベントを処理する
- **THEN** 「研究室ビーコンから退出しました」というローカル通知を送信しなければならない (SHALL)
- **AND** 通知タイトルは「研究室」、本文にはビーコン名またはデバイス ID を含めなければならない (SHALL)

#### Scenario: Beacon monitoring error notification

- **GIVEN** iOS でビーコン監視の開始または停止が失敗した
- **WHEN** エラーが発生する
- **THEN** 「ビーコン監視エラー」というローカル通知を送信しなければならない (SHALL)
- **AND** 通知本文にはエラー理由 (例: 権限不足) を含めなければならない (SHALL)
- **AND** ユーザーに設定アプリでの権限確認を促すメッセージを含めなければならない (SHALL)
