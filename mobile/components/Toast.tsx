import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
}

export function Toast({ message, type = 'success', visible }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  const bgColor = type === 'success' ? '#39FF14' : type === 'error' ? '#FF5F1F' : '#444';
  const textColor = type === 'success' ? '#000' : '#fff';
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 9999,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View style={{
        backgroundColor: bgColor,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: bgColor,
        shadowOpacity: 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
      }}>
        <Text style={{ fontSize: 18, marginRight: 10 }}>{icon}</Text>
        <Text style={{ color: textColor, fontWeight: '700', fontSize: 14, flex: 1 }}>{message}</Text>
      </View>
    </Animated.View>
  );
}
