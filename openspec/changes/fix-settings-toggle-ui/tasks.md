# Tasks — fix-settings-toggle-ui

1. Grounding / Audit

   - [ ] 調査: Tamagui の Switch コンポーネントの最新ガイドを確認（Thumb 必須/推奨構造、アクセシビリティ属性）
   - [ ] 既存 UI の目視（Dev Client）での壊れ方を記録（スクショ任意）

2. Implementation (scoped)

   - [ ] SettingsPanel.tsx: `item.type === "toggle"` のレンダリングを `<Switch> + <Switch.Thumb>` 構造に更新
   - [ ] 同コンテキストで `accessibilityRole="switch"` と `accessibilityLabel`（title を流用）を付与
   - [ ] disabled の反映は既存の `disabled` を維持（Tamagui デフォルトの視覚表現に任せる）

3. Validation

   - [ ] `npm run lint` を実行し、静的解析エラーを解消
   - [ ] iOS/Android Dev Client でオン/オフ切替とフォーカス挙動を目視確認
   - [ ] VoiceOver/TalkBack での読み上げ（スイッチ/オン・オフ）を確認

4. Notes / Risks
   - Tamagui のテーマトークンで色が十分コントラストを満たすか簡易確認（AA 目視）
   - 影響ファイルは SettingsPanel.tsx のみ。回帰が発生した場合は `item.type === "select"|"action"` など他型に影響が出ていないか併せて確認
