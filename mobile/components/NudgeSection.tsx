import { View, Text, TouchableOpacity, Alert } from 'react-native';

const usersInDanger = [
  { id: 1, name: 'Alex B.', missedDays: 1 },
  { id: 2, name: 'Sarah W.', missedDays: 2 },
];

export default function NudgeSection() {
  const handleNudge = (name: string) => {
    Alert.alert('Nudge Sent', `You nudged ${name} to keep their streak alive!`);
  };

  return (
    <View className="mt-8 bg-[#3A0000] rounded-3xl p-5 border border-red-500/50">
      <View className="flex-row items-center mb-3">
        <Text className="text-red-500 text-lg mr-2">⚠️</Text>
        <Text className="text-white font-black text-lg tracking-widest">EN PELIGRO</Text>
      </View>
      <Text className="text-gray-300 text-sm mb-4">Amigos a punto de perder su racha.</Text>
      
      <View className="space-y-3 gap-3">
        {usersInDanger.map(user => (
          <View key={user.id} className="flex-row items-center justify-between bg-black/40 p-3 rounded-2xl">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gray-600 mr-3" />
              <View>
                <Text className="text-white font-bold">{user.name}</Text>
                <Text className="text-red-400 text-xs">{user.missedDays} {user.missedDays === 1 ? 'día' : 'días'} sin subir prueba</Text>
              </View>
            </View>
            <TouchableOpacity 
              className="bg-white/10 px-4 py-2 rounded-xl"
              onPress={() => handleNudge(user.name)}
            >
              <Text className="text-white font-bold">Nudge 🔔</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}
