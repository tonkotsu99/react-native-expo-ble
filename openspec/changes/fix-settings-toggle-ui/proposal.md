# fix-settings-toggle-ui — Settings のトグル UI 修正提案

<!-- OPENSPEC:START -->

## Summary

Settings 画面のトグル（notifications, vibrationFeedback, autoReconnect など）が視覚的に「壊れて」見える。原因は Tamagui の Switch コンポーネントで必要な Thumb のレンダリングが欠落している可能性が高く、視覚的なつまみが表示されず可用性が低下している。

この変更では、トグル UI を Tamagui の推奨構造（<Switch> + <Switch.Thumb>）に準拠させ、アクセシビリティとタッチターゲットを改善する、最小限かつスコープの狭い修正を提案する。

## Goals

- 視覚的な壊れを解消し、トグルの状態が明確に判別できること
- 既存の Settings データモデル・イベントハンドラ（onSettingChange）を尊重し、API 変更を行わないこと
- Tamagui のテーマ/トークンを尊重し、既存の配色体系に沿うこと
- アクセシビリティ（VoiceOver/ TalkBack）で適切に読み上げられること

## Non-Goals

- 新規の設定項目の追加や削除
- テーマ切り替えの復活（appearance セクションは非表示のまま）
- Settings 全体の大幅なレイアウト変更

## Current Behaviour (observed)

- SettingsPanel.tsx では `item.type === "toggle"` の場合に `<Switch ... />` を単体でレンダリングしている
- Tamagui v1 系では視覚的なつまみ（Thumb）を `<Switch.Thumb />` として子要素に明示するのが一般的
- そのため UI 上でスライダーのつまみが表示されない/見えにくい/配置が崩れるなどの不具合が起こり得る

## Proposed Change

1. Toggle UI を `<Switch>` 内に `<Switch.Thumb />` を追加する形に更新
   - 例: `<Switch size="$2" checked={...} onCheckedChange={...}>\n  <Switch.Thumb animation="bouncy" />\n</Switch>`
2. アクセシビリティ属性（`accessibilityLabel`, `accessibilityRole="switch"`）を付与
3. 無効状態（disabled）の視覚表現をトークンで担保（不透明度や色味の微調整は Tamagui デフォルトを優先）
4. タッチターゲットは最小 44pt 四方を満たす（size は `$2` のままでも十分な場合が多いが、要目視）

## Impact & Risk

- 影響範囲は `components/organisms/SettingsPanel.tsx` のみ。
- 既存の props/型は変更しないため、後方互換性リスクは低い。
- 視覚・操作性の向上が見込めるが、テーマやプラットフォーム固有の描画差があるため実機（Dev Client）検証は必要。

## Alternatives Considered

- 独自のトグルコンポーネント（Button + 状態アイコン）: 実装コストが高く、既存設計と乖離。
- 別ライブラリの Switch に置換: Tamagui を使い続ける方が一貫性が高い。

## Validation

- Lint を通過
- iOS/Android Dev Client で視覚確認（オン/オフ状態、無効状態、フォーカスリング）
- VoiceOver/TalkBack での読み上げ確認（役割=スイッチ、現在値）

<!-- OPENSPEC:END -->
