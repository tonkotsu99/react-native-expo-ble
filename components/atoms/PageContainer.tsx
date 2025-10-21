import { FC, ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { YStack } from "tamagui";

type Prorps = {
  children: ReactNode;
};

export const PageContainer: FC<Prorps> = ({ children}) => (
  <SafeAreaView style={{ flex: 1}}>
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" padding="$4">
      {children}
    </YStack>

  </SafeAreaView>
)