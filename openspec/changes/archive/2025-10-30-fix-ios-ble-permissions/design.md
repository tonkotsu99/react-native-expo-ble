# Design: iOS BLE Permissions Fix

## Context

現在の`useBLE.ts`実装は Android 専用の権限処理のみを含んでおり、iOS での Bluetooth 権限管理が欠落している。`react-native-ble-plx`はクロスプラットフォームライブラリだが、各プラットフォーム固有の権限処理が必要。

## Goals / Non-Goals

**Goals:**

- iOS で BLE 権限リクエストを適切に処理する
- Android 既存機能を維持する
- クロスプラットフォーム対応の権限処理実装
- ユーザー体験の向上（明確なエラーメッセージ）

**Non-Goals:**

- バックグラウンド BLE 処理の変更
- BLE 接続ロジックの大幅変更
- 新しい BLE ライブラリへの移行

## Decisions

### 1. プラットフォーム統合権限処理

- **決定**: `requestAndroidPermissions`を`requestPermissions`に変更し、iOS/Android 両対応にする
- **理由**: 関数名がプラットフォーム中立的になり、将来の拡張性が向上
- **実装**: Platform.OS による分岐で各プラットフォーム固有処理を実装

### 2. iOS 権限処理方式

- **決定**: `bleManager.state()`を使用して Bluetooth 状態確認を行う
- **理由**: `react-native-ble-plx`の標準 API で、システム権限ダイアログを自動トリガー
- **パターン**: 状態チェック → 必要に応じてユーザー権限リクエスト → 結果処理

### 3. エラーハンドリング戦略

- **決定**: BLE 権限エラー時には通知システムを使用してユーザーフィードバックを提供
- **理由**: 既存の通知インフラ活用でコンシステンシー維持
- **実装**: `utils/notifications.ts`に新しい権限エラー通知関数を追加

## Migration Plan

### ステップ 1: 権限処理の統合

1. `requestAndroidPermissions`を`requestPermissions`に改名
2. iOS 用 Bluetooth 状態チェックロジックを追加
3. プラットフォーム分岐を実装

### ステップ 2: エラーハンドリング改善

1. BLE 権限エラー専用通知関数を追加
2. `AttendancePage`でエラー状態表示を改善
3. iOS 設定画面へのディープリンク機能を検討

### ステップ 3: テストと検証

1. iOS 実機での権限フロー検証
2. Android 回帰テスト実行
3. エラーシナリオの動作確認
