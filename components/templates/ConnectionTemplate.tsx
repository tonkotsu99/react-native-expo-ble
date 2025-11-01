import type {
  BLEConnectionStatus,
  DeviceInfo,
} from "@/components/molecules/ConnectionVisualization";
import { ConnectionPanel } from "@/components/organisms/ConnectionPanel";
import type { DashboardState } from "@/components/organisms/StatusDashboard";
import React from "react";
import { SafeAreaView } from "react-native";
import { ScrollView, styled, YStack } from "tamagui";

export type ConnectionTemplateProps = {
  dashboardState: DashboardState;
  connectionStatus: BLEConnectionStatus;
  deviceInfo?: DeviceInfo;
  onStartScan?: () => void;
  onStopScan?: () => void;
  onConnect?: (deviceId?: string) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onCopyDeviceId?: (id: string) => void;
  hasPermissions?: boolean;
  bluetoothEnabled?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  accessibilityLabel?: string;
};

const Root = styled(SafeAreaView, {
  name: "ConnectionTemplate",
  flex: 1,
  backgroundColor: "$background",
});

export function ConnectionTemplate(props: ConnectionTemplateProps) {
  const {
    connectionStatus,
    deviceInfo,
    onStartScan,
    onStopScan,
    onConnect,
    onDisconnect,
    onReconnect,
    onCopyDeviceId,
    hasPermissions = true,
    bluetoothEnabled = true,
    headerContent,
    footerContent,
    accessibilityLabel,
  } = props;

  const a11y = {
    accessibilityLabel: accessibilityLabel || "Connection",
    accessible: true,
  } as const;

  return (
    <Root {...a11y}>
      {headerContent}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <YStack gap="$3">
          <ConnectionPanel
            variant="default"
            showHeader={true}
            showAdvancedControls={true}
            compactMode={false}
            connectionStatus={connectionStatus}
            deviceInfo={deviceInfo}
            onStartScan={onStartScan}
            onStopScan={onStopScan}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onReconnect={onReconnect}
            onCopyDeviceId={onCopyDeviceId}
            hasPermissions={hasPermissions}
            bluetoothEnabled={bluetoothEnabled}
          />
        </YStack>
      </ScrollView>
      {footerContent}
    </Root>
  );
}
