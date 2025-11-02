import { API_URL_INSIDE_AREA } from "../constants";
import { getUserId } from "../state/userProfile";

const LOG_PREFIX = "[InsideAreaStatus]";

export type InsideAreaStatusMetadata = {
  regionIdentifier?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number | null;
  source: "geofence" | "periodic" | "ble" | "ble_disconnect";
};

export const postInsideAreaStatus = async (
  metadata: InsideAreaStatusMetadata
): Promise<boolean> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.warn(`${LOG_PREFIX} Skipping inside-area post: missing userId`);
      return false;
    }

    const response = await fetch(API_URL_INSIDE_AREA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    console.log(
      `${LOG_PREFIX} Reported inside-area status (source=${metadata.source})`
    );
    return true;
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to post inside-area status: ${
        (error as Error).message
      }`
    );
    return false;
  }
};
