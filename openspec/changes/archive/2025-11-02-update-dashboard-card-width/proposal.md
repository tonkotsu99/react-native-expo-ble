## Why

現在のダッシュボードでは在室ステータスカード (`StatusCard`) と BLE 接続ステータスカード (`ConnectionVisualization`) の横幅が揃わず、並んだ際に段差が生じています。視認性と情報比較性を高めるため、2 枚のカードを同じ幅で揃える必要があります。

## What Changes

- `StatusDashboard` の横並びレイアウトを調整し、在室ステータスカードと BLE 接続カードの横幅を常に一致させます。
- 必要に応じて `ConnectionVisualization`／`StatusCard` のコンテナスタイルを調整し、共通の最小幅・高さを共有できるようにします。
- `attendance-ui` 仕様を更新し、両カードの横幅を揃えることを明文化します。

## Impact

- 影響する仕様: attendance-ui（ダッシュボード UI レイアウト）。
- 影響するコード: components/organisms/StatusDashboard.tsx、components/molecules/ConnectionVisualization.tsx、関連テンプレート。
- リスク: 画面幅が極端に狭いデバイスで横幅固定が崩れる可能性があるため、ブレークポイント調整や縦並びフォールバックの検証が必要です。
