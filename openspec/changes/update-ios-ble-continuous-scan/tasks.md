# Tasks: Update iOS BLE Continuous Scan

## Implementation Tasks

### 1. Geofence Task の iOS 対応

- [x] 1.1 `tasks/geofencingTask.ts` の ENTER イベントで、iOS でも `startContinuousBleScanner()` を呼び出すように変更 ✅
- [x] 1.2 iOS 専用の `tryDetectBeacon()` 呼び出しをコメントアウト (削除はしない) ✅
- [x] 1.3 iOS 専用の `startRapidRetryWindow()` 呼び出しをコメントアウト ✅
- [x] 1.4 EXIT イベントで、iOS でも `stopContinuousBleScanner()` を呼び出すように変更 ✅

**Validation**:

- ✅ TypeScript コンパイルが通る
- ✅ `npm run lint` が通る
- ⏳ ジオフェンス ENTER/EXIT のログが両 OS で同じ形式になる (実機テストで確認)

### 2. iOS 実機テスト (TestFlight)

- [ ] 2.1 TestFlight ビルドを作成 (`eas build --profile development --platform ios`)
- [ ] 2.2 学外 → 学内 (ジオフェンス ENTER) でスキャン開始を確認
- [ ] 2.3 ビーコン接近 (RSSI > -70) で PRESENT 遷移を確認
- [ ] 2.4 ビーコン離反 (RSSI <= -75) で UNCONFIRMED → 3 分後 INSIDE_AREA 遷移を確認
- [ ] 2.5 学外退出 (ジオフェンス EXIT) でスキャン停止を確認

**Validation**:

- 各状態遷移で通知が正しく表示される
- バックグラウンドでも RSSI による状態遷移が機能する

### 3. バックグラウンド持続性テスト (iOS)

- [ ] 3.1 アプリをバックグラウンドに移行し、6 時間放置
- [ ] 3.2 ログで連続スキャンが継続しているか確認
- [ ] 3.3 State Restoration によるウェイクアップ回数を記録
- [ ] 3.4 バッテリー消費を測定 (Settings → Battery)

**Validation**:

- 6 時間後もスキャンが継続している、または定期タスクが再開している
- バッテリー消費が Android と同程度 (±10%)

### 4. tryDetectBeacon と Rapid Retry の非推奨化

- [x] 4.1 `tryDetectBeacon()` 関数に `@deprecated` コメントを追加 ✅
- [x] 4.2 `startRapidRetryWindow()` 関数に `@deprecated` コメントを追加 ✅
- [x] 4.3 `stopRapidRetryWindow()` 関数に `@deprecated` コメントを追加 ✅
- [x] 4.4 非推奨の理由をコメントに記載 ("iOS now uses continuous scan like Android") ✅

**Validation**:

- ✅ コードベースで非推奨関数が呼び出されていない (ENTER/EXIT イベントでコメントアウト済み)
- ✅ TypeScript コンパイルと lint が通る

### 5. ドキュメント更新

- [ ] 5.1 `openspec/project.md` の「iOS 実機検証メモ」セクションを更新 (連続スキャン方式を明記)
- [ ] 5.2 `.github/copilot-instructions.md` の iOS 動作説明を更新
- [ ] 5.3 `README.md` に iOS バックグラウンドスキャンの仕組みを追記

**Validation**:

- ドキュメントに iOS と Android の動作差分 (フォアグラウンドサービス有無) が明記されている

### 6. OpenSpec Validation

- [ ] 6.1 `npx openspec validate update-ios-ble-continuous-scan --strict` を実行
- [ ] 6.2 すべてのエラーを解決
- [ ] 6.3 `tasks.md` のチェックボックスを更新

**Validation**:

- OpenSpec validation が成功する

## Dependencies

- **Task 2 depends on Task 1**: 実装完了後に実機テスト
- **Task 3 depends on Task 2**: 基本動作確認後に長時間テスト
- **Task 4 depends on Task 3**: 連続スキャンの安定性確認後に非推奨化

## Parallelizable Work

- Task 5 (ドキュメント更新) は Task 1 と並行可能
- Task 6 (OpenSpec Validation) は Task 1-4 完了後に実行

## Notes

- **Rollback Plan**: Task 1 の変更を Revert すれば、iOS は元の `tryDetectBeacon()` 方式に戻る
- **Risk Assessment**: iOS の State Restoration が不安定な場合、定期タスク (15 分) がフォールバックとして機能する
- **Future Work**: Task 3 の結果次第で、`tryDetectBeacon()` を完全削除する別変更を作成
