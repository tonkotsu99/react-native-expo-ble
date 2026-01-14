export const GEOFENCE_REGION = {
  identifier: "office-kyutech",
  latitude: 33.8935,
  longitude: 130.8412,
  // Androidの精度・取りこぼし対策として200mに拡大（useGeofencing.ts と同期）
  radius: 200,
} as const;
