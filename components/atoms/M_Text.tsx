import { FC } from "react";
import { Text, TextProps } from "tamagui";

export const M_Text: FC<TextProps> = ({ children, ...props}) => (
  <Text fontSize="$6" color="$color" {...props}>
    {children}
  </Text>
)