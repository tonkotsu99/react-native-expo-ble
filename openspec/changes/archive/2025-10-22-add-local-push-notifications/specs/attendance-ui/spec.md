# attendance-ui Specification Delta

## MODIFIED Requirements

### Requirement: Manual Attendance Controls Page

アプリは出席ページを表示し、BLE 在室フローのための接続状態と手動操作を提供しなければならない (SHALL)。ユーザー操作の結果はローカル通知で通知しなければならない (SHALL)。

#### Scenario: Start scan from disconnected state

- **GIVEN** ユーザーが出席ページを開き、BLE デバイスが未接続である
- **WHEN** ユーザーがメインのアクションボタンをタップする
- **THEN** アプリは `useBLE` を通じて BLE パーミッションを要求しなければならない (SHALL)
- **AND** スキャン/接続フローを起動し、成功時にはデバイスが接続済みになるようにしなければならない (SHALL)
- **AND** 接続成功時には「研究室デバイスに接続しました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Disconnect via action panel

- **GIVEN** BLE デバイスが接続済みである
- **WHEN** ユーザーが退室ボタンをタップする
- **THEN** アプリは `disconnectDevice` を呼び出して接続を解除しなければならない (SHALL)
- **AND** 接続状態インジケーターは切断状態を示さなければならない (SHALL)
- **AND** 切断成功時には「研究室デバイスから切断されました」というローカル通知を送信しなければならない (SHALL)

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
- **THEN** ページは操作をブロックし、ユーザーに ID 設定を促すガイダンス通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用せず、ローカル通知を利用しなければならない (SHALL)

## ADDED Requirements

### Requirement: User ID Management Notifications

ユーザーID の保存、読み込み、検証時の結果は `Alert.alert()` ではなくローカル通知で通知しなければならない (SHALL)。

#### Scenario: User ID save success notification

- **GIVEN** ユーザーが新しいユーザーIDを入力して保存する
- **WHEN** `useAttendanceUserId.ts` がユーザーIDを正常に保存する
- **THEN** 「ユーザーIDを保存しました」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない

#### Scenario: User ID save failure notification

- **GIVEN** ユーザーIDの保存処理でエラーが発生する
- **WHEN** `useAttendanceUserId.ts` が保存に失敗する
- **THEN** 「保存に失敗しました」というローカル通知を送信しなければならない (SHALL)
- **AND** エラーメッセージが通知本文に含まれる

#### Scenario: User ID required notification

- **GIVEN** ユーザーIDが未設定の状態でBLE操作が試みられる
- **WHEN** `useRequireUserId.ts` がユーザーID未設定を検出する
- **THEN** 「ユーザーIDを設定してください」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない

#### Scenario: User ID loading notification

- **GIVEN** ユーザーIDの読み込み処理が進行中である
- **WHEN** `useRequireUserId.ts` がローディング状態を検出する
- **THEN** 「ユーザーID読込中」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない
