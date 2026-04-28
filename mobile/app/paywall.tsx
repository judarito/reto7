import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';
// import Purchases from 'react-native-purchases'; // To be configured with RevenueCat keys

export default function PaywallScreen() {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 10 });
    opacity.value = withSpring(1);
  }, []);

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handlePurchase = async () => {
    try {
      /* RevenueCat Logic MVP
      if (Platform.OS !== 'web') {
        const purchaseInfo = await Purchases.purchasePackage(packageToBuy);
        // Backend webhook will automatically credit the freeze
      }
      */
      console.log('Mock Purchase successful');
      router.back();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background justify-center px-8">
      
      {/* Broken Flame */}
      <View className="items-center mb-10">
        <Text className="text-[100px] shadow-[0_0_40px_rgba(255,95,31,0.5)] color-neonOrange opacity-80" 
              style={{ textShadowColor: 'rgba(255, 95, 31, 0.7)', textShadowRadius: 30, textShadowOffset: {width: 0, height: 0} }}>
          🔥
        </Text>
        {/* Visual trick for a broken flame could be a slash icon over it, but for text we use a simple broken heart emoji next to it or just the text below */}
        <Text className="text-white text-5xl font-black mt-4 text-center">💔 ¡OH NO!</Text>
        <Text className="text-gray-400 text-lg mt-3 text-center">Racha de 14 días en peligro.</Text>
      </View>

      {/* Glossy Shield */}
      <View className="items-center mb-16">
        <Animated.View style={shieldStyle}>
          <View className="bg-gradient-to-br from-neonOrange to-red-600 rounded-full w-40 h-40 items-center justify-center border-4 border-white/10 shadow-[0_0_50px_rgba(255,95,31,0.3)]">
            <Text className="text-[80px]">🛡️</Text>
          </View>
        </Animated.View>
        <Text className="text-gray-300 font-bold text-xl mt-4 uppercase tracking-widest">Escudo de Racha</Text>
      </View>

      {/* Buy Button */}
      <View className="w-full">
        <TouchableOpacity 
          className="w-full bg-neonOrange py-5 rounded-3xl items-center shadow-[0_0_30px_rgba(255,95,31,0.4)]"
          onPress={handlePurchase}
        >
          <Text className="text-black font-black text-xl tracking-widest uppercase">Comprar por $0.99 USD</Text>
        </TouchableOpacity>

        <TouchableOpacity className="mt-6" onPress={() => router.back()}>
          <Text className="text-gray-500 text-center text-sm font-medium underline">Continuar con mi racha en cero 💀</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
