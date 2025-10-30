# attendance-ui Specification

## Purpose

TBD - created by archiving change add-attendance-page-ui. Update Purpose after archive.

## Requirements

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

### Requirement: BLE Device Connection

UI はクロスプラットフォーム（iOS/Android）で BLE 権限処理と接続機能を提供しなければならない (SHALL)。権限拒否時には適切なユーザーフィードバックを表示しなければならない (SHALL)。

#### Scenario: Request BLE permissions on iOS

- **GIVEN** ユーザーが iOS デバイスで入室ボタンを押下する
- **WHEN** `useBLE.requestPermissions()` が呼び出される
- **THEN** システムは Bluetooth 状態を確認し、必要に応じて権限ダイアログを表示しなければならない (SHALL)
- **AND** ユーザーが権限を許可した場合、BLE スキャンを開始しなければならない (SHALL)
- **AND** ユーザーが権限を拒否した場合、適切なエラー通知を表示しなければならない (SHALL)

#### Scenario: Handle iOS Bluetooth disabled

- **GIVEN** iOS 端末で Bluetooth が無効になっている
- **WHEN** `useBLE.requestPermissions()` が呼び出される
- **THEN** システムは Bluetooth 有効化を促すメッセージを表示しなければならない (SHALL)
- **AND** ユーザーを設定画面に誘導する選択肢を提供しなければならない (SHALL)

#### Scenario: Cross-platform permission handling

- **GIVEN** Android/iOS 問わず BLE 機能を使用する
- **WHEN** 権限リクエストが実行される
- **THEN** 各プラットフォーム固有の権限処理が適切に実行されなければならない (SHALL)
- **AND** 権限状態に応じて一貫した UI フィードバックが提供されなければならない (SHALL)

### Requirement: User ID Management Notifications

ユーザー ID の保存、読み込み、検証時の結果は `Alert.alert()` ではなくローカル通知で通知しなければならない (SHALL)。

#### Scenario: User ID save success notification

- **GIVEN** ユーザーが新しいユーザー ID を入力して保存する
- **WHEN** `useAttendanceUserId.ts` がユーザー ID を正常に保存する
- **THEN** 「ユーザー ID を保存しました」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない

#### Scenario: User ID save failure notification

- **GIVEN** ユーザー ID の保存処理でエラーが発生する
- **WHEN** `useAttendanceUserId.ts` が保存に失敗する
- **THEN** 「保存に失敗しました」というローカル通知を送信しなければならない (SHALL)
- **AND** エラーメッセージが通知本文に含まれる

#### Scenario: User ID required notification

- **GIVEN** ユーザー ID が未設定の状態で BLE 操作が試みられる
- **WHEN** `useRequireUserId.ts` がユーザー ID 未設定を検出する
- **THEN** 「ユーザー ID を設定してください」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない

#### Scenario: User ID loading notification

- **GIVEN** ユーザー ID の読み込み処理が進行中である
- **WHEN** `useRequireUserId.ts` がローディング状態を検出する
- **THEN** 「ユーザー ID 読込中」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない
