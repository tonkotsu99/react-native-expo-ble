## 1. Implementation

- [x] 1.1 `hooks/useBLE.ts`の`requestAndroidPermissions`を`requestPermissions`に変更し、iOS/Android 両対応の権限処理を実装する
- [x] 1.2 `bleManager.state()`を使用して iOS Bluetooth 状態確認とユーザー権限プロンプトを追加する
- [x] 1.3 `app.json`で iOS Bluetooth パーミッション設定が適切に設定されていることを確認する
- [x] 1.4 BLE 権限拒否時のエラーハンドリングを改善し、適切な通知メッセージを表示する
- [x] 1.5 `AttendancePage`で iOS 権限エラー時の適切なフィードバック（アラートまたは通知）を提供する

## 2. Testing & Validation

- [ ] 2.1 iOS 実機で BLE 権限リクエストが正常に表示されることを確認する
- [ ] 2.2 権限許可後に BLE スキャンと接続が正常に動作することを確認する
- [ ] 2.3 権限拒否時に適切なエラーメッセージが表示されることを確認する
- [ ] 2.4 Android 端末での既存機能が破綻していないことを確認する
- [x] 2.5 `npm run lint`で TypeScript エラーがないことを確認する

## 3. Documentation

- [x] 3.1 `README.md`に iOS/Android BLE 権限要件を記載する
- [x] 3.2 トラブルシューティング手順をドキュメントに追加する
