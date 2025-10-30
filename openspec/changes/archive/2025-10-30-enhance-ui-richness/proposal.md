# Proposal: Enhance UI Richness

## Why

現在の UI は基本的な機能は提供できているが、視覚的魅力とユーザビリティの面で改善の余地がある。ユーザーエクスペリエンスを向上させ、よりモダンで直感的なインターフェースを提供することで、アプリの使いやすさと満足度を向上させる必要がある。

具体的な課題：

- 現在の接続状態表示が文字のみで視覚的に分かりにくい
- アプリの全体的な状態（OUTSIDE, INSIDE_AREA, PRESENT, UNCONFIRMED）がユーザーに見えない
- 履歴やログ情報の表示がない
- アニメーションやトランジションが不足
- アクセシビリティ対応が不十分
- 暗黒モード対応がない

## What Changes

### 新しい UI コンポーネント追加：

- **StatusCard**: アプリ状態を視覚的に表示するカード型コンポーネント
- **ConnectionVisualization**: BLE 接続状態をアニメーション付きで表示
- **ActivityLog**: 最近の接続・切断・状態変更履歴を表示
- **ThemeToggle**: ライト/ダークモード切り替えボタン
- **ProgressCard**: スキャン進行状況を美しく表示

### 既存コンポーネント強化：

- **Header**: アイコン、アニメーション、状態インジケーターを追加
- **ActionPanel**: ホバー効果、押下アニメーション、アクセシビリティ改善
- **StatusIndicator**: アイコン、色彩の豊富化、アニメーション

### レイアウト改善：

- カード型レイアウトでコンテンツを整理
- グリッドベースの配置で視覚的階層を改善
- レスポンシブデザインの強化

## Impact

- Affected specs: `attendance-ui`
- Affected code: すべての UI コンポーネント、新規 atoms/molecules/organisms 追加
- Dependencies: 新しいアイコンライブラリ、アニメーション機能
