## MODIFIED Requirements

### Requirement: Manual Attendance Controls Page

アプリは出席ページを表示し、BLE 在室フローのための接続状態と手動操作を提供しなければならない (SHALL)。

#### Scenario: Start scan from disconnected state

- **GIVEN** ユーザーが出席ページを開き、BLE デバイスが未接続である
- **WHEN** ユーザーがメインのアクションボタンをタップする
- **THEN** アプリは `useBLE` を通じて BLE パーミッションを要求しなければならない (SHALL)
- **AND** スキャン/接続フローを起動し、成功時にはデバイスが接続済みになるようにしなければならない (SHALL)

#### Scenario: Disconnect via action panel

- **GIVEN** BLE デバイスが接続済みである
- **WHEN** ユーザーが退室ボタンをタップする
- **THEN** アプリは `disconnectDevice` を呼び出して接続を解除しなければならない (SHALL)
- **AND** 接続状態インジケーターは切断状態を示さなければならない (SHALL)

#### Scenario: Show scanning progress

- **GIVEN** ユーザーが出席ページからスキャンを開始する
- **WHEN** スキャンが進行中である
- **THEN** ページはスキャン完了までアクションボタンをローディングインジケーターに置き換えなければならない (SHALL)

#### Scenario: Display connected device details

- **GIVEN** BLE デバイスが接続済みである
- **THEN** 出席ページは接続状態とデバイス名をヘッダーに表示しなければならない (SHALL)

#### Scenario: Require user identifier before actions

- **GIVEN** ユーザー ID が永続ストアに設定されていない
- **WHEN** ユーザーがスキャンまたは退室操作を試みる
- **THEN** ページは操作をブロックし、ユーザーに ID 設定を促すガイダンスを表示しなければならない (SHALL)
