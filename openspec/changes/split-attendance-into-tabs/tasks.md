# Tasks: split-attendance-into-tabs

1. Create `components/pages/DashboardPage.tsx` rendering the dashboard view via `EnhancedMainTemplate`.
2. Create `components/pages/ConnectionPage.tsx` rendering the connection controls via `EnhancedMainTemplate`.
3. Create `components/pages/SettingsPage.tsx` rendering settings and `UserIdModal` via `EnhancedMainTemplate`.
4. Introduce tab-focused templates: `DashboardTemplate`, `ConnectionTemplate`, `SettingsTemplate` and refactor the pages to use them.
5. Update `app/(tabs)/index.tsx`, `app/(tabs)/connection.tsx`, and `app/(tabs)/settings.tsx` to import the new pages.
6. Keep `AttendancePage.tsx` for compatibility; remove references from routes.
7. Run lint/typecheck and fix any issues.
8. Smoke test navigation and basic actions on device/emulator.
