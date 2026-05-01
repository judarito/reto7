import { ActivityIndicator, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';

interface HeaderActionButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  label?: string;
  variant?: 'icon' | 'pill';
  accent?: 'green' | 'orange' | 'neutral';
  style?: StyleProp<ViewStyle>;
}

const ACCENT_STYLES = {
  green: {
    backgroundColor: 'rgba(57,255,20,0.12)',
    borderColor: 'rgba(57,255,20,0.5)',
    textColor: '#39FF14',
  },
  orange: {
    backgroundColor: 'rgba(255,95,31,0.12)',
    borderColor: 'rgba(255,95,31,0.5)',
    textColor: '#FF5F1F',
  },
  neutral: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
    textColor: '#FFFFFF',
  },
} as const;

export function HeaderActionButton({
  onPress,
  disabled = false,
  loading = false,
  icon,
  label,
  variant = 'icon',
  accent = 'neutral',
  style,
}: HeaderActionButtonProps) {
  const palette = ACCENT_STYLES[accent];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={14}
      android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: false }}
      style={({ pressed }) => [
        {
          width: variant === 'icon' ? 44 : undefined,
          minWidth: variant === 'icon' ? 44 : 88,
          height: 44,
          paddingHorizontal: variant === 'icon' ? 0 : 14,
          borderRadius: variant === 'icon' ? 22 : 999,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          flexShrink: 0,
          overflow: 'hidden',
          backgroundColor: palette.backgroundColor,
          borderWidth: 1,
          borderColor: palette.borderColor,
          opacity: pressed || isDisabled ? 0.72 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} size="small" />
      ) : (
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {icon ? (
            <Text
              pointerEvents="none"
              style={{
                color: palette.textColor,
                fontSize: variant === 'icon' ? 28 : 18,
                fontWeight: '700',
                marginRight: label ? 6 : 0,
                lineHeight: variant === 'icon' ? 30 : 20,
              }}
            >
              {icon}
            </Text>
          ) : null}
          {label ? (
            <Text
              pointerEvents="none"
              style={{
                color: palette.textColor,
                fontSize: 12,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              {label}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
