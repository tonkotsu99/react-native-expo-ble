# Spec: Tabbed Attendance UI

## ADDED Requirements

### Requirement: Separate pages per tab

アプリは `/`, `/connection`, `/settings` の各タブに対応する専用ページコンポーネントを提供し、該当タブでそのページをレンダリングしなければならない (SHALL)。

#### Scenario: Dashboard tab renders DashboardPage

- **GIVEN** the user navigates to `/` (Dashboard tab)
- **WHEN** the Expo Router resolves the route
- **THEN** it SHALL render `components/pages/DashboardPage.tsx`
- **AND** the page SHALL display the dashboard summary via `StatusDashboard` through `EnhancedMainTemplate`

#### Scenario: Connection tab renders ConnectionPage

- **GIVEN** the user navigates to the `/connection` tab
- **WHEN** the route component mounts
- **THEN** it SHALL render `components/pages/ConnectionPage.tsx`
- **AND** the page SHALL show connection controls via `ConnectionPanel` through `EnhancedMainTemplate`

#### Scenario: Settings tab renders SettingsPage

- **GIVEN** the user navigates to the `/settings` tab
- **WHEN** the route component renders
- **THEN** it SHALL render `components/pages/SettingsPage.tsx`
- **AND** the page SHALL expose settings and user ID editing via `SettingsPanel` and `UserIdModal` through `EnhancedMainTemplate`

### Requirement: Atomic Design boundaries preserved

各ページコンポーネントは既存のテンプレートおよびオーガニズムを組み合わせ、原子デザインレイヤーを再実装してはならない (SHALL NOT)。必要な UI は `EnhancedMainTemplate` とオーガニズム (`StatusDashboard`, `ConnectionPanel`, `SettingsPanel`) を介して提供しなければならない (SHALL)。

#### Scenario: Page composition respects design layers

- **WHEN** a reviewer inspects each page component file
- **THEN** the implementation SHALL use `EnhancedMainTemplate`
- **AND** it SHALL pass data to the existing organisms (`StatusDashboard`, `ConnectionPanel`, `SettingsPanel`) instead of recreating atom/molecule markup

### Requirement: Routing uses dedicated pages

`app/(tabs)/` 配下のルートファイルは、単一の `AttendancePage` ではなくタブ専用ページを import し、各タブでそれを描画しなければならない (SHALL)。

#### Scenario: Tab routes import correct page files

- **GIVEN** the files under `app/(tabs)/`
- **WHEN** imports are resolved
- **THEN** `index.tsx` SHALL import `DashboardPage`
- **AND** `connection.tsx` SHALL import `ConnectionPage`
- **AND** `settings.tsx` SHALL import `SettingsPage`

## VALIDATION

- `npm run lint` passes without new errors.
- Basic navigation succeeds on device/emulator.
