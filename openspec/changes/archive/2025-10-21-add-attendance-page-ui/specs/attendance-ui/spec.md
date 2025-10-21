## ADDED Requirements

### Requirement: Manual Attendance Controls Page

アプリは出席ページを表示し、BLE 在室フローのための接続状態と手動操作を提供しなければならない (SHALL)。

#### Scenario: Start scan from disconnected state

- **GIVEN** ユーザーが出席ページを開き、BLE デバイスが未接続である
- **WHEN** ユーザーがメインのアクションボタンをタップする
- **THEN** アプリは `useBLE` を通じて BLE パーミッションを要求しなければならない (SHALL)
- **AND** スキャン/接続フローを起動し、成功時にはデバイスが接続済みになるようにしなければならない (SHALL)

#### Scenario: Disconnect while connected

- **GIVEN** BLE デバイスが接続済みで出席ページが表示されている
- **WHEN** ユーザーがセカンダリのアクションボタンをタップする
- **THEN** アプリは接続解除のために `disconnectDevice` を呼び出さなければならない (SHALL)
- **AND** 接続状態インジケーターは切断状態を反映しなければならない (SHALL)

#### Scenario: Show scanning progress

- **GIVEN** ユーザーが出席ページからスキャンを開始する
- **WHEN** スキャンが進行中である
- **THEN** ページはスキャン完了までアクションボタンをローディングインジケーターに置き換えなければならない (SHALL)
