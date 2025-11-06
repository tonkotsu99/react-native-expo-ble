import { FC } from "react";
import { XStack } from "tamagui";
import { M_Text } from "../atoms/M_Text";

type Props = {
  connected: boolean;
  deviceName: string | null;
};

export const StatusIndicator: FC<Props> = ({ connected, deviceName }) => (
  <XStack alignItems="center" gap="$2">
    <M_Text color="$gray10">ビーコン検出:</M_Text>
    {connected ? (
      <M_Text color="$green10" fontWeight="bold">{`検出済み (${
        deviceName || "Unknown"
      })`}</M_Text>
    ) : (
      <M_Text color="$orange10" fontWeight="bold">
        未検出
      </M_Text>
    )}
  </XStack>
);
