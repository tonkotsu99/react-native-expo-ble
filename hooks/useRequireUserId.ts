import {
  sendUserIdLoadingNotification,
  sendUserIdRequiredNotification,
} from "@/utils/notifications";
import { useCallback } from "react";

type UseRequireUserIdOptions = {
  userId: string | null;
  loading: boolean;
};

type RequireUserIdFn = () => Promise<boolean>;

export const useRequireUserId = ({
  userId,
  loading,
}: UseRequireUserIdOptions): RequireUserIdFn =>
  useCallback(async () => {
    if (loading) {
      await sendUserIdLoadingNotification();
      return false;
    }

    if (!userId) {
      await sendUserIdRequiredNotification();
      return false;
    }

    return true;
  }, [loading, userId]);
