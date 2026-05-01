import { PropsWithChildren } from 'react';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

type TabScreenProps = PropsWithChildren<SafeAreaViewProps>;

export function TabScreen({
  children,
  edges = ['top', 'left', 'right'],
  className = 'flex-1 bg-background',
  ...props
}: TabScreenProps) {
  return (
    <SafeAreaView edges={edges} className={className} {...props}>
      {children}
    </SafeAreaView>
  );
}
