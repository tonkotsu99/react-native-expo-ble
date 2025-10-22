import {
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
  };
};
