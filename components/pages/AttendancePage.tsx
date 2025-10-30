import { ActionPanel } from "@/components/organisms/ActionPanel";
import { Header } from "@/components/organisms/Header";
import { UserIdPanel } from "@/components/organisms/UserIdPanel";
import { MainTemplate } from "@/components/templates/MainTemplate";
import { useAttendanceUserId } from "@/hooks/useAttendanceUserId";
import { useBLE } from "@/hooks/useBLE";
import { useRequireUserId } from "@/hooks/useRequireUserId";
import { useCallback, useState } from "react";
import { YStack } from "tamagui";

export default function AttendancePage() {
  const { requestPermissions, startScan, disconnectDevice, connectedDevice } =
    useBLE();
  const {
    userId,
    draftUserId,
    setDraftUserId,
    isSaving,
    loading,
    saveDraftAsUserId,
    hintVisible,
  } = useAttendanceUserId();
  const requireUserId = useRequireUserId({ userId, loading });
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = useCallback(async (): Promise<void> => {
    const hasUserId = await requireUserId();
    if (!hasUserId) {
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      console.error("BLE権限が拒否されました。設定から権限を許可してください。");
      return;
    }

    setIsScanning(true);
    try {
      await startScan();
      console.log("スキャン・接続プロセスが完了しました");
    } catch (error) {
      console.error("スキャンまたは接続に失敗しました", error);
    } finally {
      setIsScanning(false);
    }
  }, [requireUserId, requestPermissions, startScan]);

  const handleDisconnect = useCallback(async (): Promise<void> => {
    const hasUserId = await requireUserId();
    if (!hasUserId) {
      return;
    }

    try {
      await disconnectDevice();
      console.log("手動で切断しました");
    } catch (error) {
      console.error("切断に失敗しました", error);
    }
  }, [disconnectDevice, requireUserId]);

  const actionsDisabled = loading || isSaving || !userId;

  return (
    <MainTemplate
      header={
        <Header
          connected={!!connectedDevice}
          deviceName={connectedDevice?.name || null}
        />
      }
      mainAction={
        <YStack gap="$4" width="100%" alignItems="center">
          <UserIdPanel
            value={draftUserId}
            onChange={(value) => setDraftUserId(value)}
            onSave={saveDraftAsUserId}
            saving={isSaving}
            loading={loading}
            hintVisible={hintVisible}
          />
          <ActionPanel
            connected={!!connectedDevice}
            isScanning={isScanning}
            onScan={handleScan}
            onDisconnect={handleDisconnect}
            disabled={actionsDisabled}
          />
        </YStack>
      }
    />
  );
}
