import * as Notifications from "expo-notifications";

/**
 * 通知チャンネルの設定
 * フォアグラウンドでも通知を表示する
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * 通知パーミッションを要求する
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[Notifications] Permission not granted");
      return false;
    }

    console.log("[Notifications] Permission granted");
    return true;
  } catch (error) {
    console.error("[Notifications] Permission request failed:", error);
    return false;
  }
}

/**
 * 通知を送信するヘルパー関数
 */
async function scheduleNotification(
  title: string,
  body: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // 即座に通知
    });
    console.log(`[Notifications] Sent: ${title} - ${body}`);
  } catch (error) {
    console.error(`[Notifications] Failed to send: ${title}`, error);
  }
}

/**
 * ジオフェンス入場通知
 */
export async function sendGeofenceEnterNotification(): Promise<void> {
  await scheduleNotification("九工大エリア", "九工大エリアに入りました");
}

/**
 * ジオフェンス退出通知
 */
export async function sendGeofenceExitNotification(): Promise<void> {
  await scheduleNotification("九工大エリア", "九工大エリアを出ました");
}

/**
 * BLE接続成功通知
 */
export async function sendBleConnectedNotification(
  deviceName?: string | null
): Promise<void> {
  const name = deviceName ?? "デバイス";
  await scheduleNotification("研究室", `${name}に接続しました`);
}

/**
 * BLE切断通知
 */
export async function sendBleDisconnectedNotification(
  deviceName?: string | null
): Promise<void> {
  const name = deviceName ?? "デバイス";
  await scheduleNotification("研究室", `${name}から切断されました`);
}

/**
 * 状態変化通知 - PRESENT
 */
export async function sendStatePresentNotification(): Promise<void> {
  await scheduleNotification("出席確認", "出席状態になりました");
}

/**
 * 状態変化通知 - UNCONFIRMED
 */
export async function sendStateUnconfirmedNotification(): Promise<void> {
  await scheduleNotification("出席確認", "状態が未確認に変更されました");
}

/**
 * ユーザーID保存成功通知
 */
export async function sendUserIdSavedNotification(): Promise<void> {
  await scheduleNotification("ユーザーID", "ユーザーIDを保存しました");
}

/**
 * ユーザーID保存失敗通知
 */
export async function sendUserIdSaveFailedNotification(
  errorMessage?: string
): Promise<void> {
  const message = errorMessage
    ? `保存に失敗しました: ${errorMessage}`
    : "保存に失敗しました。時間をおいて再度お試しください。";
  await scheduleNotification("ユーザーID", message);
}

/**
 * ユーザーID未設定通知
 */
export async function sendUserIdRequiredNotification(): Promise<void> {
  await scheduleNotification("ユーザーID", "ユーザーIDを設定してください");
}

/**
 * ユーザーID読込中通知
 */
export async function sendUserIdLoadingNotification(): Promise<void> {
  await scheduleNotification(
    "ユーザーID",
    "ユーザーID読込中です。処理が完了するまでお待ちください。"
  );
}

/**
 * BLE権限エラー通知
 */
export async function sendBlePermissionErrorNotification(): Promise<void> {
  await scheduleNotification(
    "Bluetooth権限",
    "Bluetooth権限が必要です。設定からBluetoothを有効にしてください。"
  );
}

/**
 * iOS Bluetooth無効通知
 */
export async function sendBluetoothDisabledNotification(): Promise<void> {
  await scheduleNotification(
    "Bluetooth無効",
    "Bluetoothが無効です。設定から有効にしてアプリを再起動してください。"
  );
}
