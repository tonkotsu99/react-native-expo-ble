# タスク

1.  [x] **ログと通知の確認**: `tasks/geofencingTask.ts` と `tasks/periodicCheckTask.ts` のログと通知ロジックが iOS でも有効であることを確認する（Android 固有の分岐になっていないかチェック）。
    - 検証: コードレビュー。
2.  [x] **テストガイドの作成**: `docs/IOS_BACKGROUND_TESTING.md` を執筆する。
    - 以下の手順を含める:
      - Dev Client のビルド (`eas build --profile development --platform ios`)。
      - TestFlight または AdHoc でのインストール。
      - 権限の付与（位置情報を常に許可）。
      - Console.app を使用したログの確認方法。
      - 実地歩行テストの手順。
3.  [ ] **検証**: ユーザーがガイドに従ってテストを実行する。
