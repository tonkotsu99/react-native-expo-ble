import { useUserProfile } from "@/hooks/useUserProfile";
import {
  sendUserIdRequiredNotification,
  sendUserIdSavedNotification,
  sendUserIdSaveFailedNotification,
} from "@/utils/notifications";
import { useCallback, useEffect, useState } from "react";

type UseAttendanceUserIdResult = {
  userId: string | null;
  draftUserId: string;
  setDraftUserId: (value: string) => void;
  isSaving: boolean;
  loading: boolean;
  saveDraftAsUserId: () => Promise<void>;
  hintVisible: boolean;
};

export const useAttendanceUserId = (): UseAttendanceUserIdResult => {
  const { userId, loading, saveUserId, error } = useUserProfile();
  const [draftUserId, setDraftUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setDraftUserId(userId ?? "");
    }
  }, [loading, userId]);

  useEffect(() => {
    if (error) {
      console.error("ユーザーIDの読み込みに失敗しました", error);
    }
  }, [error]);

  const saveDraftAsUserId = useCallback(async () => {
    const trimmed = draftUserId.trim();
    if (!trimmed) {
      await sendUserIdRequiredNotification();
      return;
    }

    setIsSaving(true);
    try {
      await saveUserId(trimmed);
      await sendUserIdSavedNotification();
    } catch (err) {
      console.error("ユーザーIDの保存に失敗しました", err);
      await sendUserIdSaveFailedNotification();
    } finally {
      setIsSaving(false);
    }
  }, [draftUserId, saveUserId]);

  return {
    userId,
    draftUserId,
    setDraftUserId,
    isSaving,
    loading,
    saveDraftAsUserId,
    hintVisible: !loading && !userId,
  };
};
