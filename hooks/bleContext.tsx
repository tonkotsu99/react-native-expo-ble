import React, { createContext, useContext, useMemo } from "react";
import type { BeaconDetection } from "./useBLE";
import { useBLE } from "./useBLE";

export type BLEContextValue = {
  requestPermissions: () => Promise<boolean>;
  startScan: () => Promise<void>;
  disconnectDevice: () => Promise<void>;
  refresh: () => Promise<void>;
  detectedBeacon: BeaconDetection | null;
};

const BLEContext = createContext<BLEContextValue | null>(null);

export const BLEProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    requestPermissions,
    startScan,
    disconnectDevice,
    refresh,
    detectedBeacon,
  } = useBLE();

  const value = useMemo<BLEContextValue>(
    () => ({
      requestPermissions,
      startScan,
      disconnectDevice,
      refresh,
      detectedBeacon,
    }),
    [requestPermissions, startScan, disconnectDevice, refresh, detectedBeacon]
  );

  return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
};

export const useBLEContext = (): BLEContextValue => {
  const ctx = useContext(BLEContext);
  if (!ctx) {
    throw new Error("useBLEContext must be used within a BLEProvider");
  }
  return ctx;
};
