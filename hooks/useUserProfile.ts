import {
  clearUserId as clearStoredUserId,
  getUserId as getStoredUserId,
  setUserId as setStoredUserId,
} from "@/state/userProfile";
import { useCallback, useEffect, useState } from "react";

interface UseUserProfile {
  userId: string | null;
  loading: boolean;
  error: Error | null;
  saveUserId(userId: string): Promise<void>;
  clearUserId(): Promise<void>;
}

export const useUserProfile = (): UseUserProfile => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await getStoredUserId();
        if (mounted) {
          setUserId(stored);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const saveUserId = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      await clearStoredUserId();
      setUserId(null);
      return;
    }

    await setStoredUserId(trimmed);
    setUserId(trimmed);
  }, []);

  const clearUserId = useCallback(async () => {
    await clearStoredUserId();
    setUserId(null);
  }, []);

  return {
    userId,
    loading,
    error,
    saveUserId,
    clearUserId,
  };
};
