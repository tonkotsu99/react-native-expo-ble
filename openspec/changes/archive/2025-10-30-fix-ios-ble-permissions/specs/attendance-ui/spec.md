# attendance-ui Specification Delta

## MODIFIED Requirements

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
