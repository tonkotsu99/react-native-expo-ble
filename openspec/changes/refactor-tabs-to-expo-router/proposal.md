## Why

現在のタブは `components/pages/AttendancePage.tsx` 内でローカル state により管理されています。これは Expo Router のベストプラクティスに反し、

- ルーティングの一貫性（URL/ディープリンク）
- OS の戻る動作・履歴
- 画面別のコード分割・遅延読み込み
  の面で不利です。ファイルベースのタブに移行して、可読性と拡張性を高めます。

## What Changes

- Expo Router の Tabs を用いたファイルベースのタブグループ `(tabs)` を `app/` 配下に導入します。
- 3 画面（dashboard, connection, settings）を `app/(tabs)/` 直下のファイルとして分割します。（logs タブは廃止）
- タブ切替は Router の `push/replace` によって行い、内部 state での切替は撤廃します（段階的移行時はブリッジ層を用意）。
- `app/_layout.tsx` は現状の Provider 構成・`useGeofencing()` 呼び出しを維持し、`app/(tabs)/_layout.tsx` で Tabs を定義します。
- モバイルの重複ナビ（EnhancedMainTemplate のボトムナビ）を抑止できるプロパティ（例: `hideBottomNavigation`）を導入し、Router 管理のタブと重ならないようにします。  
  （この点は UI テンプレート要件の軽微な変更に該当）

## Impact

- Affected specs:
  - 新規: `navigation`（ファイルベースタブ）
  - 既存: `attendance-ui`（Responsive Main Template の軽微変更: ボトムナビの抑止フラグ）
- Affected code:
  - `app/_layout.tsx`（維持）/ `app/(tabs)/_layout.tsx`（新規）
  - `app/(tabs)/index.tsx`, `connection.tsx`, `settings.tsx`（新規）
  - `components/templates/EnhancedMainTemplate.tsx`（ボトムナビ抑止用 prop の追加）
  - `app/index.tsx`（初期画面を `(tabs)` に誘導するためのリダイレクトやエクスポート見直し）
