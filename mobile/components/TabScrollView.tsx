import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ScrollView, ScrollViewProps } from 'react-native';

type TabScrollViewProps = ScrollViewProps & {
  extraBottomPadding?: number;
};

export function TabScrollView({
  children,
  contentContainerStyle,
  extraBottomPadding = 24,
  ...props
}: TabScrollViewProps) {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        { paddingBottom: tabBarHeight + extraBottomPadding },
        contentContainerStyle,
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
