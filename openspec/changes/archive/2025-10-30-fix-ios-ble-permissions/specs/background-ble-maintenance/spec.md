# background-ble-maintenance Specification Delta

## MODIFIED Requirements

### Requirement: Cross-Platform BLE Permissions

バックグラウンド BLE 処理は、iOS/Android 両プラットフォームで適切な権限管理を実行しなければならない (SHALL)。権限不足によるスキャン失敗時には適切なログ記録を行わなければならない (SHALL)。

#### Scenario: iOS background BLE permissions

- **GIVEN** バックグラウンドタスクが iOS で BLE スキャンを実行する
- **WHEN** 権限チェックが実行される
- **THEN** iOS 固有の Bluetooth 権限状態を確認しなければならない (SHALL)
- **AND** 権限不足の場合はスキャンをスキップし、警告ログを記録しなければならない (SHALL)

#### Scenario: Handle iOS Bluetooth state changes

- **GIVEN** iOS で Bluetooth がシステム設定で無効化される
- **WHEN** バックグラウンド BLE タスクが実行される
- **THEN** タスクは Bluetooth 状態を確認してスキャンを適切にスキップしなければならない (SHALL)
- **AND** Bluetooth 無効状態のログ記録を行わなければならない (SHALL)
