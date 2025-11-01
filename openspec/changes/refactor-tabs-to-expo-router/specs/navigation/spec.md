## ADDED Requirements

### Requirement: File-based Tab Navigation

The app SHALL implement file-based tabs using Expo Router under `app/(tabs)/` with three routes: `index` (dashboard), `connection`, and `settings`. The previous `logs` tab is removed.

#### Scenario: Route structure

- **GIVEN** the app uses Expo Router
- **WHEN** developers add files under `app/(tabs)/`
- **THEN** the tab routes SHALL be available as `(tabs)/`, `(tabs)/connection`, `(tabs)/settings`
- **AND** the initial route SHALL be `(tabs)/` (dashboard)

#### Scenario: Deep linking to a specific tab

- **GIVEN** a deep link to `(tabs)/settings`
- **WHEN** the app is opened via the link
- **THEN** the settings tab SHALL be active and rendered

#### Scenario: Back button behavior

- **GIVEN** a user navigates across tabs
- **WHEN** pressing the system back button on Android
- **THEN** navigation SHALL pop tab history appropriately before exiting the app

### Requirement: Router-driven Tab Switching

Tab changes SHALL be handled by navigation (router push/replace) instead of local component state.

#### Scenario: Programmatic tab change

- **GIVEN** a screen needs to switch tabs after an action
- **WHEN** `onTabChange('settings')` is called
- **THEN** the app SHALL navigate to `(tabs)/settings` using the Router

## MODIFIED Requirements

### Requirement: Responsive Main Template (Bottom Navigation controllable)

The main template SHALL support an option to hide its internal bottom navigation when the app is using Router-managed tabs, to prevent duplicated navigations.

#### Scenario: Hide internal bottom navigation

- **GIVEN** the app renders a screen within Router Tabs
- **WHEN** the template is mounted with `hideBottomNavigation = true`
- **THEN** the internal bottom navigation SHALL not render on mobile layouts
