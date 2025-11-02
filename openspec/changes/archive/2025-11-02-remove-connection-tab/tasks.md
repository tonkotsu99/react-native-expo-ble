# Tasks: remove-connection-tab

## 1. Specification

- [x] 1.1 Update `attendance-ui` requirement text to describe dashboard-hosted manual controls and document the connection tab removal.

## 2. Implementation

- [x] 2.1 Remove the `/connection` tab entry from `app/(tabs)/_layout.tsx` and adjust styling if needed for two tabs.
- [x] 2.2 Delete `app/(tabs)/connection.tsx` and retire `components/pages/ConnectionPage.tsx` plus the unused `ConnectionTemplate`.
- [x] 2.3 Ensure dashboard connection controls expose all manual actions (scan, disconnect, reconnect, device info) and clean up any stray imports or context usage.

## 3. Validation

- [x] 3.1 Run `npm run lint` and smoke test dashboard actions on a device/emulator.
