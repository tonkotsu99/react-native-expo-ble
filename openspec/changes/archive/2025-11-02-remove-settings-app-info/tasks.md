# Tasks: remove-settings-app-info

## 1. Specification

- [x] 1.1 Update `attendance-ui` spec to state that the settings screen SHALL NOT render an "アプリ情報" section.

## 2. Implementation

- [x] 2.1 Remove the about/app-info section from `components/organisms/SettingsPanel.tsx`, including version display and associated link items.
- [x] 2.2 Clean up any SettingsTemplate or page code that references removed props (e.g., appVersion/appBuild handlers) and ensure no dangling links remain.

## 3. Validation

- [x] 3.1 Run `npm run lint` and smoke test the settings screen to confirm the section is gone.
