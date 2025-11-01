import {
  getAppState,
  subscribeAppState,
  type AppState,
} from "@/state/appState";
import { useEffect, useState } from "react";

/**
 * React hook to read and subscribe to the global AppState stored in AsyncStorage.
 * - Initializes from persisted storage
 * - Subscribes to in-memory change notifications
 */
export const useAppState = (): AppState => {
  const [state, setState] = useState<AppState>("OUTSIDE");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getAppState();
        if (mounted) setState(s);
      } catch {}
    })();

    const unsubscribe = subscribeAppState((s) => setState(s));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return state;
};
