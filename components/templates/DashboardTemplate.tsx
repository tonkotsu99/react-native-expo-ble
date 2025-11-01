import type {
  BLEConnectionStatus,
  DeviceInfo,
} from "@/components/molecules/ConnectionVisualization";
import {
  StatusDashboard,
  type DashboardState,
} from "@/components/organisms/StatusDashboard";
import React from "react";
import { SafeAreaView } from "react-native";
import { ScrollView, styled, YStack } from "tamagui";

export type DashboardTemplateProps = {
  dashboardState: DashboardState;
  connectionStatus: BLEConnectionStatus;
  deviceInfo?: DeviceInfo;
  onReconnect?: () => void;
  onDisconnect?: () => void;
  onCopyDeviceId?: (id: string) => void;
  onAppStatePress?: (state: any) => void;
  onRefreshDashboard?: () => void;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  accessibilityLabel?: string;
};

const Root = styled(SafeAreaView, {
  name: "DashboardTemplate",
  flex: 1,
  backgroundColor: "$background",
});

export function DashboardTemplate(props: DashboardTemplateProps) {
  const {
    dashboardState,
    onAppStatePress,
    onReconnect,
    onDisconnect,
    onCopyDeviceId,
    onRefreshDashboard,
    headerContent,
    footerContent,
    accessibilityLabel,
  } = props;

  const a11y = {
    accessibilityLabel: accessibilityLabel || "Dashboard",
    accessible: true,
  } as const;

  return (
    <Root {...a11y}>
      {headerContent}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <YStack space="$3">
          <StatusDashboard
            layout="default"
            variant="default"
            dashboardState={dashboardState}
            showHeader={true}
            compactMode={false}
            stackCards={false}
            onAppStatePress={onAppStatePress}
            onRefresh={onRefreshDashboard}
            onReconnect={onReconnect}
            onDisconnect={onDisconnect}
            onCopyDeviceId={onCopyDeviceId}
          />
        </YStack>
      </ScrollView>
      {footerContent}
    </Root>
  );
}
