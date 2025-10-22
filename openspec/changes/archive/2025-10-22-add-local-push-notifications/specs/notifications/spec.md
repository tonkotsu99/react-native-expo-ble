# Notifications Specification

## Overview

ローカルプッシュ通知機能により、ジオフェンス入退出、BLE接続/切断、状態変化などのイベントをユーザーに通知します。バックグラウンド・フォアグラウンド両方で動作し、既存の `Alert.alert()` を置き換えて一貫した通知体験を提供します。

## ADDED Requirements

### Requirement: Local Push Notification System

アプリケーションは、ジオフェンス、BLE、状態変化などのイベント発生時にローカルプッシュ通知を送信しなければならない (SHALL)。通知はバックグラウンドタスクとUIコンポーネントの両方から送信可能でなければならない (SHALL)。

#### Scenario: Geofence enter notification

- **WHEN** ユーザーがジオフェンス領域（九工大エリア）に入る
- **THEN** 「九工大エリアに入りました」というタイトルと本文を持つローカル通知が送信される
- **AND** 通知はアプリがバックグラウンドでもフォアグラウンドでも表示される

#### Scenario: Geofence exit notification

- **WHEN** ユーザーがジオフェンス領域（九工大エリア）から出る
- **THEN** 「九工大エリアを出ました」というタイトルと本文を持つローカル通知が送信される
- **AND** 通知はアプリがバックグラウンドでもフォアグラウンドでも表示される

#### Scenario: BLE connection notification

- **WHEN** BLEデバイスへの接続が成功する
- **THEN** 「研究室デバイスに接続しました」というタイトルと本文を持つローカル通知が送信される
- **AND** デバイス名が通知本文に含まれる

#### Scenario: BLE disconnection notification

- **WHEN** BLEデバイスとの接続が切断される
- **THEN** 「研究室デバイスから切断されました」というタイトルと本文を持つローカル通知が送信される
- **AND** デバイス名が通知本文に含まれる

#### Scenario: State change notification

- **WHEN** アプリ状態が PRESENT または UNCONFIRMED に変化する
- **THEN** 対応する状態変化通知が送信される
- **AND** 通知本文には新しい状態が含まれる

#### Scenario: Notification permission granted

- **WHEN** アプリが起動し、通知パーミッションが未取得である
- **THEN** システムに通知パーミッションを要求する
- **AND** パーミッションが許可された場合、通知送信が有効になる

#### Scenario: Notification permission denied

- **WHEN** ユーザーが通知パーミッションを拒否する
- **THEN** 通知送信の試行は行われるが、エラーは静かにログに記録される
- **AND** アプリの主要機能（BLE、ジオフェンス）は継続して動作する

#### Scenario: Foreground notification handling

- **WHEN** アプリがフォアグラウンドにある状態で通知が送信される
- **THEN** 通知はシステム通知トレイに表示される
- **AND** フォアグラウンド通知ハンドラーが通知を処理する

### Requirement: Replace Alert.alert with Notifications

既存の `Alert.alert()` 呼び出しはすべてローカル通知に置き換えられなければならない (SHALL)。これにより、バックグラウンドとフォアグラウンドで一貫した通知体験を提供する。

#### Scenario: User ID save success notification

- **WHEN** ユーザーIDが正常に保存される
- **THEN** 「ユーザーIDを保存しました」という通知が送信される
- **AND** 既存の `Alert.alert()` は使用されない

#### Scenario: User ID save failure notification

- **WHEN** ユーザーIDの保存に失敗する
- **THEN** 「保存に失敗しました」という通知が送信される
- **AND** エラーメッセージが通知本文に含まれる

#### Scenario: User ID required notification

- **WHEN** ユーザーIDが未設定の状態でBLE操作が試みられる
- **THEN** 「ユーザーIDを設定してください」という通知が送信される
- **AND** 既存の `Alert.alert()` は使用されない

### Requirement: Notification Configuration

通知設定（パーミッション、チャンネル、ハンドラー）はアプリ起動時に初期化されなければならない (SHALL)。Android と iOS の両プラットフォームで適切に動作しなければならない (SHALL)。

#### Scenario: Android notification channel setup

- **WHEN** Android デバイスでアプリが起動する
- **THEN** デフォルト通知チャンネルが `app.json` の設定に基づいて作成される
- **AND** 通知の重要度は DEFAULT に設定される

#### Scenario: iOS notification setup

- **WHEN** iOS デバイスでアプリが起動する
- **THEN** 通知パーミッションがシステムに要求される
- **AND** パーミッションが許可された場合、通知が有効になる

#### Scenario: Notification listener registration

- **WHEN** アプリが初期化される（`app/_layout.tsx`）
- **THEN** 通知受信リスナーとレスポンスハンドラーが登録される
- **AND** フォアグラウンド通知の表示設定が適用される
