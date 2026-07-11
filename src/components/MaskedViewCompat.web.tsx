import { View, type ViewProps } from 'react-native';

export default function MaskedViewCompat({ children, ...props }: ViewProps) {
  return <View {...props}>{children}</View>;
}
