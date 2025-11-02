## ADDED Requirements

### Requirement: Dashboard cards share aligned width

ダッシュボードで横並びに表示される在室ステータスカードと BLE 接続ステータスカードは、常に同じ横幅で揃えなければならない (SHALL)。狭小画面で縦積みに切り替わる場合でも、共有の最小幅を用いて視覚的な段差を生じさせてはならない (SHALL NOT)。

#### Scenario: Horizontal layout keeps cards flush

- **GIVEN** `StatusDashboard` renders with `stackCards = false` and `showConnectionDetails = true`
- **WHEN** both the 在室ステータスカード and the BLE 接続ステータスカード are displayed side by side
- **THEN** the two cards SHALL have matching widths so their 左端・右端が一直線に揃う
- **AND** both cards SHALL respect a shared minimum width token to prevent staggered sizing

#### Scenario: Narrow screens maintain consistent minimum width

- **GIVEN** the viewport is narrower than the minimum side-by-side width
- **WHEN** the layout wraps or stacks the cards vertically
- **THEN** each card SHALL continue using the shared minimum width token
- **AND** no card SHALL shrink below that minimum, avoiding noticeable width jumps when stacking
