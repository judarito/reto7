import * as admin from 'firebase-admin';
import { Expo } from 'expo-server-sdk';

let firebaseInitialized = false;
const expo = new Expo();

function initFirebase() {
  if (firebaseInitialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️  Firebase Admin SDK not configured. Push notifications will be stored in DB only.');
    console.warn('   Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to your .env');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized');
  } catch (e) {
    console.error('❌ Firebase init failed:', e);
  }
}

initFirebase();

export async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!firebaseInitialized) return false;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: data ?? {},
      android: {
        notification: {
          color: '#39FF14',
          sound: 'default',
          channelId: 'default',
        },
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    return true;
  } catch (e) {
    console.error('FCM send error:', e);
    return false;
  }
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (Expo.isExpoPushToken(pushToken)) {
    try {
      await expo.sendPushNotificationsAsync([
        {
          to: pushToken,
          title,
          body,
          data: data ?? {},
          sound: 'default',
        },
      ]);
      return true;
    } catch (e) {
      console.error('Expo push send error:', e);
      return false;
    }
  }

  return sendFCMNotification(pushToken, title, body, data);
}
