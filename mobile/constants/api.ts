import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host machine localhost
// iOS simulator uses localhost directly
// Physical device: replace with your computer's LAN IP (e.g. 192.168.1.X)
// Replace with your computer's LAN IP so physical devices can connect
export const API_URL = 'http://192.168.0.105:3000/api';
