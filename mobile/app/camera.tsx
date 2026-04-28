import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-8">
        <Text className="text-white text-center mb-6 text-lg">We need your permission to show the camera</Text>
        <TouchableOpacity 
          className="bg-neonOrange px-6 py-3 rounded-full"
          onPress={requestPermission}
        >
          <Text className="text-black font-bold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      // For MVP, just go back and pretend it uploaded
      console.log('Photo taken:', photo?.uri);
      router.back();
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        facing="back"
        ref={cameraRef}
      >
        {/* Top UI */}
        <View className="flex-row justify-between items-center px-6 pt-16">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-black/50">
            <Text className="text-white text-2xl">✕</Text>
          </TouchableOpacity>

          <View className="bg-black/60 border border-neonOrange/50 px-4 py-2 rounded-full flex-row items-center">
            <Text className="text-neonOrange mr-2">💡</Text>
            <Text className="text-white text-xs font-medium">Live photos only. Gallery disabled.</Text>
          </View>

          <View className="w-10 h-10" />
        </View>

        {/* Bottom UI */}
        <View className="absolute bottom-12 w-full items-center">
          <TouchableOpacity 
            className="w-20 h-20 rounded-full border-4 border-neonOrange justify-center items-center"
            onPress={takePicture}
          >
            <View className="w-16 h-16 rounded-full bg-neonOrange" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}
