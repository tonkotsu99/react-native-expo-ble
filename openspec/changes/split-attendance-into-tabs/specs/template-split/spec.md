# Spec: Tab-focused templates

## ADDED Requirements

### Requirement: Provide thin templates per tab

- Provide templates that preconfigure `EnhancedMainTemplate` for each tab while narrowing the prop surface.

#### Scenario: DashboardTemplate sets active tab and props

- Given `DashboardTemplate` is used,
- Then it must set `activeTab` to `dashboard`,
- And accept only dashboard-relevant props,
- And render via `EnhancedMainTemplate`.

#### Scenario: ConnectionTemplate sets active tab and props

- Given `ConnectionTemplate` is used,
- Then it must set `activeTab` to `connection`,
- And accept only connection-relevant props including scan/connect handlers,
- And render via `EnhancedMainTemplate`.

#### Scenario: SettingsTemplate sets active tab and props

- Given `SettingsTemplate` is used,
- Then it must set `activeTab` to `settings`,
- And accept settings-related props including user ID handlers and custom settings items,
- And render via `EnhancedMainTemplate`.

## VALIDATION

- Pages import these specialized templates and compile.
- Lint/typecheck passes.
