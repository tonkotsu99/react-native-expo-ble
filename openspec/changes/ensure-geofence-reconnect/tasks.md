# Tasks: ensure-geofence-reconnect

## 1. Specification

- [x] 1.1 Update `background-ble-maintenance` spec to require automatic BLE rescan/reconnect when re-entering the geofence while in `INSIDE_AREA` state.

## 2. Implementation

- [x] 2.1 Adjust `geofencingTask` so that geofence enter events trigger a BLE reconnect attempt even if the app was already `INSIDE_AREA` but not connected.
- [x] 2.2 Update `periodicCheckTask` (and shared helpers) to continue short-interval rescan attempts while `INSIDE_AREA` and disconnected, backing off responsibly to avoid battery drain.

## 3. Validation

- [x] 3.1 Run `npm run lint`.
- [ ] 3.2 On an iOS device, simulate leaving and re-entering the geofence after a disconnect and confirm BLE auto-reconnect resumes without manual UI interaction.
