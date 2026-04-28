import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ReactionRow({ initialReactions }: { initialReactions: { '🔥': number, '💪': number, '👏': number } }) {
  const [reactions, setReactions] = useState(initialReactions);

  const handleReaction = (emoji: keyof typeof initialReactions) => {
    setReactions(prev => ({
      ...prev,
      [emoji]: prev[emoji] + 1
    }));
  };

  return (
    <View className="flex-row justify-around p-3 bg-[#111]">
      {(Object.keys(reactions) as Array<keyof typeof reactions>).map(emoji => (
        <TouchableOpacity 
          key={emoji} 
          onPress={() => handleReaction(emoji)}
          className="bg-[#2A2A2A] rounded-full w-10 h-10 items-center justify-center border border-[#444] shadow-sm"
        >
          <View className="absolute -top-1 -right-1 bg-neonOrange rounded-full w-4 h-4 items-center justify-center z-10">
            <Text className="text-[8px] text-white font-bold">{reactions[emoji]}</Text>
          </View>
          <Text className="text-lg">{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
