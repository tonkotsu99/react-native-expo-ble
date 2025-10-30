# Proposal: Fix iOS BLE Permissions

## Why

iOS で BLE 入室ボタンを押しても未接続のままになる問題が発生している。原因は`useBLE.ts`の`requestPermissions`関数が`requestAndroidPermissions`として実装されており、iOS 固有の Bluetooth 権限処理が含まれていないため。iOS では`react-native-ble-plx`の Bluetooth 権限リクエスト API が必要だが、現在の実装では権限チェックがスキップされ、BLE スキャンが失敗する。

## What Changes

- **BREAKING**: `useBLE.ts`の`requestAndroidPermissions`関数を`requestPermissions`に変更し、iOS/Android 両対応にする
- iOS 向けに`bleManager.state()`で Bluetooth 状態確認と権限リクエストを追加
- `app.json`で iOS 向け Bluetooth パーミッション設定を追加/確認
- BLE 権限拒否時のユーザー向けエラーハンドリングと通知を改善
- `AttendancePage`で iOS 権限エラー時の適切なフィードバックを提供

## Impact

- Affected specs: `attendance-ui`, `background-ble-maintenance`
- Affected code: `hooks/useBLE.ts`, `components/pages/AttendancePage.tsx`, `app.json`
