import {
  sendBleConnectedNotification,
  sendBleDisconnectedNotification,
  sendBlePermissionErrorNotification,
  sendBluetoothDisabledNotification,
  sendGeofenceEnterNotification,
  sendGeofenceExitNotification,
  sendStatePresentNotification,
  sendStateUnconfirmedNotification,
  sendUserIdLoadingNotification,
  sendUserIdRequiredNotification,
  sendUserIdSavedNotification,
  sendUserIdSaveFailedNotification,
} from "@/utils/notifications";

/**
 * 通知送信機能を提供するフック
 * UIコンポーネントから利用する
 */
export const useNotifications = () => {
  return {
    sendGeofenceEnterNotification,
    sendGeofenceExitNotification,
    sendBleConnectedNotification,
    sendBleDisconnectedNotification,
    sendStatePresentNotification,
    sendStateUnconfirmedNotification,
    sendUserIdSavedNotification,
    sendUserIdSaveFailedNotification,
    sendUserIdRequiredNotification,
    sendUserIdLoadingNotification,
    sendBlePermissionErrorNotification,
    sendBluetoothDisabledNotification,
  };
};
