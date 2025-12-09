import { getAppState, setAppState } from "@/state/appState";
import { ensureAndroidBackgroundCapabilities } from "@/utils/androidBackground";
import * as Location from "expo-location";
import { useEffect } from "react";
import { Platform } from "react-native";
import "../tasks/geofencingTask"; // タスク定義ファイルをインポートして登録

const GEOFENCING_TASK_NAME = "background-geofencing-task";

// ジオフェンス中心座標
const GEOFENCE_CENTER = {
  latitude: 33.8935,
  longitude: 130.8412,
  radius: 200, // メートル
};

/**
 * 2点間の距離を計算（メートル）
 */
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 現在位置がジオフェンス内かどうかをチェック
 */
const checkInitialLocation = async (): Promise<void> => {
  try {
    const currentState = await getAppState();

    // 既に INSIDE_AREA または PRESENT の場合はスキップ
    if (currentState === "INSIDE_AREA" || currentState === "PRESENT") {
      console.log("[Geofencing] Initial check skipped: already inside area");
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
    });

    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      GEOFENCE_CENTER.latitude,
      GEOFENCE_CENTER.longitude
    );

    console.log(
      `[Geofencing] Initial location check: distance=${distance.toFixed(
        0
      )}m, radius=${GEOFENCE_CENTER.radius}m`
    );

    if (distance <= GEOFENCE_CENTER.radius) {
      console.log(
        "[Geofencing] Inside geofence at startup, setting state to INSIDE_AREA"
      );
      await setAppState("INSIDE_AREA");
    } else if (currentState === "UNCONFIRMED") {
      // UNCONFIRMED 状態でジオフェンス外なら OUTSIDE に修正
      console.log(
        "[Geofencing] Outside geofence at startup, fixing UNCONFIRMED to OUTSIDE"
      );
      await setAppState("OUTSIDE");
    }
  } catch (error) {
    console.warn("[Geofencing] Failed to check initial location:", error);
  }
};

/**
 * ジオフェンシングのセットアップを行うカスタムフック。
 * アプリ起動時に一度だけ呼び出すことを想定しています。
 */
export const useGeofencing = () => {
  const requestPermissions = async (): Promise<boolean> => {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === "granted") {
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus === "granted") {
        return true;
      }
    }
    return false;
  };

  const startGeofencing = async (): Promise<void> => {
    const isTaskStarted = await Location.hasStartedGeofencingAsync(
      GEOFENCING_TASK_NAME
    );
    if (isTaskStarted) {
      console.log("Geofencing is already started.");
      return;
    }

    // 位置情報サービスが有効かチェック
    const locationEnabled = await Location.hasServicesEnabledAsync();
    if (!locationEnabled) {
      console.error("Location services are disabled");
      return;
    }

    await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, [
      {
        identifier: "office-kyutech",
        latitude: 33.8935, // 九州工業大学の緯度
        longitude: 130.8412, // 九州工業大学の経度
        radius: 200, // 半径を200m (Android精度向上のため100mから増加)
        notifyOnEnter: true, // 明示的に入場検知を有効化
        notifyOnExit: true,
      },
    ]);
    console.log("Geofencing started with radius: 200m");
  };

  useEffect(() => {
    const setupGeofencing = async () => {
      const hasPermissions = await requestPermissions();
      if (hasPermissions) {
        if (Platform.OS === "android") {
          await ensureAndroidBackgroundCapabilities({
            interactive: true,
            reason: "geofencing-startup",
          });
        }
        await startGeofencing();

        // アプリ起動時に現在位置をチェックして状態を補正
        await checkInitialLocation();
      } else {
        console.error(
          "位置情報へのバックグラウンドアクセスが許可されていません"
        );
      }
    };
    setupGeofencing();
  }, []); // 空の依存配列で、マウント時に一度だけ実行
};
