# Spec: Tabbed Attendance UI

## ADDED Requirements

### Requirement: Separate pages per tab

- The app must provide three page components aligned with the tab routes.

#### Scenario: Dashboard tab renders DashboardPage

- Given the user navigates to `/` (Dashboard tab),
- Then `components/pages/DashboardPage.tsx` is rendered,
- And it shows a dashboard summary via `StatusDashboard` through `EnhancedMainTemplate`.

#### Scenario: Connection tab renders ConnectionPage

- Given the user navigates to `/connection` tab,
- Then `components/pages/ConnectionPage.tsx` is rendered,
- And it shows connection controls via `ConnectionPanel` through `EnhancedMainTemplate`.

#### Scenario: Settings tab renders SettingsPage

- Given the user navigates to `/settings` tab,
- Then `components/pages/SettingsPage.tsx` is rendered,
- And it shows settings and user ID editing via `SettingsPanel` and `UserIdModal` through `EnhancedMainTemplate`.

### Requirement: Atomic Design boundaries preserved

- Pages must compose existing organisms/templates rather than inlining UI details.

#### Scenario: Page composition respects design layers

- When inspecting each page file,
- Then it should use `EnhancedMainTemplate` and pass data to organisms (`StatusDashboard`, `ConnectionPanel`, `SettingsPanel`) instead of recreating atom/molecule markup.

### Requirement: Routing uses dedicated pages

- Tab route files must import the dedicated page components instead of the monolithic `AttendancePage`.

#### Scenario: Tab routes import correct page files

- Given the files under `app/(tabs)/`,
- Then `index.tsx` imports `DashboardPage`, `connection.tsx` imports `ConnectionPage`, and `settings.tsx` imports `SettingsPage`.

## VALIDATION

- `npm run lint` passes without new errors.
- Basic navigation succeeds on device/emulator.
