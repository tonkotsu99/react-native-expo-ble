# Proposal: Split AttendancePage into Tab-specific Pages

- change-id: split-attendance-into-tabs
- date: 2025-11-01
- owner: app
- status: Proposed

## Summary

The monolithic `AttendancePage` currently renders all three conceptual sections (dashboard, connection, settings) and is routed via `(tabs)` by swapping the active tab. This proposal creates dedicated page components per tab while preserving Atomic Design:

- `components/pages/DashboardPage.tsx`
- `components/pages/ConnectionPage.tsx`
- `components/pages/SettingsPage.tsx`

Route files under `app/(tabs)/` will import these new pages directly. The existing organisms (`StatusDashboard`, `ConnectionPanel`, `SettingsPanel`) continue to be used via `EnhancedMainTemplate` to maintain layout consistency. Additionally, we introduce thin, tab-focused templates that wrap `EnhancedMainTemplate`:

- `components/templates/DashboardTemplate.tsx`
- `components/templates/ConnectionTemplate.tsx`
- `components/templates/SettingsTemplate.tsx`

These provide a narrower prop surface per tab and help keep page files minimal.

## Motivation

- Improves separation of concerns and file discoverability.
- Enables future tab-specific data fetching and lifecycle without carrying unrelated state.
- Aligns routing files with page-level components per Atomic Design.

## Scope

- Routing unchanged: still uses `app/(tabs)` with three tabs.
- No API or BLE/geofencing logic changes.
- `AttendancePage` remains for compatibility but is no longer referenced by tab routes.

## Non-Goals

- Deep redesign of UI or state management.
- Creating a new global context. Minimal refactor only.

## Risks and Mitigations

- Duplication risk: Kept minimal by reusing `EnhancedMainTemplate` and only implementing handlers needed per tab. Future iteration can extract shared hooks if needed.
- Background tasks: Ensure `useGeofencing()` remains invoked at app shell (`app/_layout.tsx`). No change required.

## Validation

- Lint/typecheck passes.
- Manual navigation across tabs shows appropriate content with no runtime errors.
- BLE actions still gated by userId and permissions where applicable.
