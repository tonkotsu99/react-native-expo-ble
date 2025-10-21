import type { FC } from 'react';
import { Button, type ButtonProps } from 'tamagui';

export const L_Button: FC<ButtonProps> = ({ children, theme = 'blue', ...props }) => (
  <Button size="$5" width="80%" theme={theme} {...props}>
    {children}
  </Button>
);