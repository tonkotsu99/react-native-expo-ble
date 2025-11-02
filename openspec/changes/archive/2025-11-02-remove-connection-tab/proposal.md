## Why

ダッシュボード画面だけで BLE 接続操作が完結しており、専用の Connection タブは重複した UI を提供しているため、ナビゲーションを複雑にしています。冗長な画面を削除することでタブバーがシンプルになり、保守コストを削減できます。

## What Changes

- `/connection` タブルートと対応するページコンポーネントを削除します。
- 手動接続操作をダッシュボードに集約し、新しいレイアウトを反映するよう仕様を更新します。
- ナビゲーションの文言とアイコンを 2 タブ構成に合わせて調整します。

## Impact

- 影響する仕様: attendance-ui（手動出席操作、タブ構成）。
- 影響するコード: app/(tabs)/\_layout.tsx、app/(tabs)/connection.tsx、components/pages/ConnectionPage.tsx、ConnectionTemplate を参照しているテンプレート、3 タブを前提とするナビゲーション状態やフック。
- 調整事項: 進行中の `split-attendance-into-tabs` 変更で定義されている「Connection タブが ConnectionPage を描画する」シナリオを置き換えるため、承認後に該当変更を更新またはクローズします。
