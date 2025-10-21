import { FC, ReactNode } from "react";
import { YStack } from "tamagui";
import { PageContainer } from "../atoms/PageContainer";

type Props = {
  header: ReactNode;
  mainAction: ReactNode;
}

export const MainTemplate: FC<Props> = ({ header, mainAction}) => (
  <PageContainer>
    <YStack flex={1} justifyContent="space-around" alignItems="center" width="100%">
      {header}
      {mainAction}
    </YStack>
  </PageContainer>
)