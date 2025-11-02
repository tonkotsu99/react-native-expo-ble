# Tasks: fix-geofence-ble-disconnect

## 1. Specification

- [x] 1.1 Update `background-ble-maintenance` spec to require geofencing-initiated connections to monitor disconnect events and revert state when the device is lost.

## 2. Implementation

- [x] 2.1 Add `device.onDisconnected` handling (and cleanup) to the `tryConnectBleDevice` flow so background connections revert state and stop reporting PRESENT when signal drops.
- [x] 2.2 Ensure the geofencing task (or shared helpers) clears background RSSI polling/scan timers and optionally cross-checks iOS state restoration so ghost connections are not persisted.

## 3. Validation

- [x] 3.1 Run `npm run lint`.
- [ ] 3.2 Test on an iOS device (TestFlight/Dev Client) by entering the geofence, letting the background task connect, then powering off the beacon to confirm state returns to `INSIDE_AREA` and notifications reflect the disconnect.
