import { FC } from "react";
import { YStack } from "tamagui";
import { M_Text } from "../atoms/M_Text";
import { StatusIndicator } from "../molecules/StatusIndicator";

type Props = {
  connected: boolean;
  deviceName: string |null;
};

export const Header: FC<Props> = ({ connected, deviceName}) => (
  <YStack alignItems="center" gap="$3">
    <M_Text fontSize="$8" fontWeight="bold">BLE 在室管理システム</M_Text>
    <StatusIndicator connected={connected} deviceName={deviceName} />
  </YStack>
)