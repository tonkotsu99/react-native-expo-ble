## RENAMED Requirements

- FROM: `### Requirement: Manual Attendance Controls Page`
- TO: `### Requirement: Manual Attendance Controls`

## MODIFIED Requirements

### Requirement: Manual Attendance Controls

アプリはダッシュボード内に BLE 在室フローのための接続操作を提供しなければならない (SHALL)。ユーザー操作の結果はローカル通知で通知しなければならない (SHALL)。ダッシュボードの手動操作のみで接続・切断フローを完遂でき、別タブに移動する必要があってはならない (SHALL NOT)。

#### Scenario: Start scan from dashboard controls

- **GIVEN** ユーザーがダッシュボードタブを開き、BLE デバイスが未接続である
- **WHEN** ユーザーがダッシュボード上のメインアクションボタンをタップする
- **THEN** アプリは `useBLE` を通じて BLE パーミッションを要求しなければならない (SHALL)
- **AND** スキャン/接続フローを起動し、成功時にはデバイスが接続済みになるようにしなければならない (SHALL)
- **AND** 接続成功時には「研究室デバイスに接続しました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Disconnect via dashboard action panel

- **GIVEN** BLE デバイスが接続済みである
- **WHEN** ユーザーがダッシュボード上の退室ボタンをタップする
- **THEN** アプリは `disconnectDevice` を呼び出して接続を解除しなければならない (SHALL)
- **AND** 接続状態インジケーターは切断状態を示さなければならない (SHALL)
- **AND** 切断成功時には「研究室デバイスから切断されました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Show scanning progress on dashboard

- **GIVEN** ユーザーがダッシュボードからスキャンを開始する
- **WHEN** スキャンが進行中である
- **THEN** ダッシュボードはスキャン完了までアクションボタンをローディングインジケーターに置き換えなければならない (SHALL)

#### Scenario: Display connected device details on dashboard

- **GIVEN** BLE デバイスが接続済みである
- **THEN** ダッシュボードは接続状態とデバイス名をヘッダーまたはカード内に表示しなければならない (SHALL)

#### Scenario: Require user identifier before dashboard actions

- **GIVEN** ユーザー ID が永続ストアに設定されていない
- **WHEN** ユーザーがダッシュボードからスキャンまたは退室操作を試みる
- **THEN** 操作をブロックし、ユーザーに ID 設定を促すガイダンス通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用せず、ローカル通知を利用しなければならない (SHALL)

#### Scenario: Connection tab removed

- **GIVEN** ユーザーがボトムタブバーを確認する
- **THEN** 「Connection」タブは表示されてはならず (SHALL NOT)、ダッシュボードと設定タブのみが表示されなければならない (SHALL)
