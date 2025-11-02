# Spec: Tab-focused templates

## ADDED Requirements

### Requirement: Provide thin templates per tab

各タブ向けに `EnhancedMainTemplate` を薄くラップするテンプレートを提供し、必要なプロップのみを公開しなければならない (SHALL)。

#### Scenario: DashboardTemplate sets active tab and props

- **GIVEN** `DashboardTemplate` is used
- **WHEN** a dashboard screen renders through the template
- **THEN** it SHALL set `activeTab` to `dashboard`
- **AND** it SHALL accept only dashboard-relevant props
- **AND** it SHALL render via `EnhancedMainTemplate`

#### Scenario: ConnectionTemplate sets active tab and props

- **GIVEN** `ConnectionTemplate` is used
- **WHEN** connection UI renders through the template
- **THEN** it SHALL set `activeTab` to `connection`
- **AND** it SHALL accept only connection-relevant props including scan/connect handlers
- **AND** it SHALL render via `EnhancedMainTemplate`

#### Scenario: SettingsTemplate sets active tab and props

- **GIVEN** `SettingsTemplate` is used
- **WHEN** settings UI renders through the template
- **THEN** it SHALL set `activeTab` to `settings`
- **AND** it SHALL accept settings-related props including user ID handlers and custom settings items
- **AND** it SHALL render via `EnhancedMainTemplate`

## VALIDATION

- Pages import these specialized templates and compile.
- Lint/typecheck passes.
