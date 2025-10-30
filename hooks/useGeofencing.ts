import * as Location from "expo-location";
import { useEffect } from "react";
import "../tasks/geofencingTask"; // タスク定義ファイルをインポートして登録

const GEOFENCING_TASK_NAME = "background-geofencing-task";

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
        radius: 450, // 半径を450m
        notifyOnExit: true,
      },
    ]);
    console.log("Geofencing started with increased radius: 450m");
  };

  useEffect(() => {
    const setupGeofencing = async () => {
      const hasPermissions = await requestPermissions();
      if (hasPermissions) {
        await startGeofencing();
      } else {
        console.error(
          "位置情報へのバックグラウンドアクセスが許可されていません"
        );
      }
    };
    setupGeofencing();
  }, []); // 空の依存配列で、マウント時に一度だけ実行
};
