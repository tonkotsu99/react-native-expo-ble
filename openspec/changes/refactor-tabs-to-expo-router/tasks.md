## 1. Implementation

- [x] 1.1 調査: `components/pages/AttendancePage.tsx` のタブ（dashboard/connection/settings）の機能と依存関係を整理（logs は廃止）
- [x] 1.2 ルーティング骨子: `app/(tabs)/_layout.tsx` を作成し `Tabs` を定義（各タブの name とスクリーンファイルを紐付け）
- [x] 1.3 画面ファイル作成: `app/(tabs)/index.tsx`, `app/(tabs)/connection.tsx`, `app/(tabs)/settings.tsx`
- [x] 1.4 コントローラ層: 共通ロジック（BLE/ジオフェンス/ユーザー ID/ログ）を一箇所にまとめるフック/コンテナを用意（暫定的には `AttendancePage` の実装を共通化）
- [x] 1.5 タブ切替: 各画面で `onTabChange` を Router ナビゲーションに接続（例: `router.push('(tabs)/settings')`）
- [x] 1.6 UI テンプレート: `EnhancedMainTemplate` に `hideBottomNavigation?: boolean` を追加し、Router 管理時は重複ナビを非表示
- [x] 1.7 既定ルート調整: `app/index.tsx` から `(tabs)` へ誘導（`Redirect` またはグループ直下の index を初期画面に）
- [ ] 1.8 最小テスト: 端末/エミュレータでタブ遷移・戻る動作・ディープリンク（例: `/settings`）を確認
- [x] 1.9 Lint: `npm run lint` パス

## 2. Validation

- [ ] 2.1 ディープリンク: `exp://.../(tabs)/settings` で settings タブが直接開く
- [ ] 2.2 戻る動作: Android のハードウェア戻るでタブ履歴 → アプリ終了が直感的に機能
- [ ] 2.3 UI 重複なし: モバイルで Expo Router の Tabs とローカルボトムナビが重複しない
- [ ] 2.4 背景初期化: `app/_layout.tsx` 側の `useGeofencing()` は 1 回だけ呼ばれる
- [ ] 2.5 非機能: パフォーマンス劣化やクラッシュがない（Minimal 分割）

## 3. Notes / Dependencies

- 変更は UI/ルーティングのみ。BLE/ジオフェンスの挙動は不変を前提に、呼び出し箇所を整理。
- Expo Dev Client 前提のネイティブ機能は従来通り（ビルド要件は変更なし）。
