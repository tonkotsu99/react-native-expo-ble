import { FC } from "react";
import { XStack } from "tamagui";
import { M_Text } from "../atoms/M_Text";

type Props = {
  connected: boolean;
  deviceName: string | null;
};

export const StatusIndicator: FC<Props> = ({ connected, deviceName }) => (
  <XStack alignItems="center" gap="$2">
    <M_Text color="$gray10">接続状態:</M_Text>
    {connected ? (
      <M_Text color="$green10" fontWeight="bold">{`接続済み (${deviceName || 'Unknown'})`}</M_Text>
    ) : (
      <M_Text color="$orange10" fontWeight="bold">未接続</M_Text>
    )}
  </XStack>
)