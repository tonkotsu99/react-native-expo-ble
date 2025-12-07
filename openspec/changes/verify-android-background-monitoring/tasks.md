# タスク

1.  [x] **既存ログの監査**: `tasks/geofencingTask.ts` と `tasks/periodicCheckTask.ts` をレビューし、`console.log` と `sendDebugNotification` が一貫して使用されていることを確認する。
    - 検証: コードを読み、ログのプレフィックスが仕様と一致することを確認する。
2.  [x] **Android 通知の強化**: `utils/androidBackground.ts` の `startAndroidBleForegroundService` が明確なフィードバックを提供することを確認する。
    - 検証: 通知のタイトル/本文を確認する。
3.  [x] **テストガイドの作成**: `docs/ANDROID_BACKGROUND_TESTING.md` を執筆する。
    - 以下の手順を含める:
      - Dev Client のビルド (`eas build --profile development --platform android`)。
      - デバイスへのインストール。
      - 権限の付与（位置情報を常に許可）。
      - ジオフェンスのシミュレーション（ADB 経由で可能な場合）または実地歩行テスト。
      - `adb logcat` によるログの検証。
4.  [x] **検証**: ユーザーがガイドに従ってテストを実行する。
