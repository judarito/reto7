import { db } from '../db';
import { notifications, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendFCMNotification } from './firebase';

export type NotificationType = 'nudge' | 'streak_danger' | 'challenge_joined' | 'new_member' | 'system';

interface SendNotificationOptions {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const NotificationService = {
  async send({ userId, type, title, body, data }: SendNotificationOptions): Promise<void> {
    // 1. Always persist to DB so the inbox works even without push
    await db.insert(notifications).values({
      userId,
      type,
      title,
      body,
      data: data ? JSON.stringify(data) : null,
      isRead: false,
      createdAt: new Date(),
    });

    // 2. Try to send FCM push if user has a token
    try {
      const userRecord = await db.select({ pushToken: users.pushToken })
        .from(users)
        .where(eq(users.id, userId));

      const token = userRecord[0]?.pushToken;
      if (token) {
        const stringData = data
          ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
          : {};
        await sendFCMNotification(token, title, body, stringData);
      }
    } catch (e) {
      console.error('Failed to send push notification:', e);
    }
  },

  async getUnreadCount(userId: number): Promise<number> {
    const unread = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
    return unread.filter(n => !n.isRead).length;
  },
};

// --- Pre-built notification templates ---

export const NotificationTemplates = {
  nudge(targetUserId: number, senderUsername: string) {
    return NotificationService.send({
      userId: targetUserId,
      type: 'nudge',
      title: '⚠️ ¡Alguien te envió un Nudge!',
      body: `${senderUsername} te recuerda que no pierdas tu racha hoy. ¡Muévete!`,
    });
  },

  newMemberJoined(creatorId: number, joinerUsername: string, challengeTitle: string, challengeId: number) {
    return NotificationService.send({
      userId: creatorId,
      type: 'new_member',
      title: '🎉 ¡Nuevo atleta en tu reto!',
      body: `${joinerUsername} se acaba de unir a "${challengeTitle}"`,
      data: { challengeId: String(challengeId) },
    });
  },

  streakDanger(userId: number, challengeTitle: string) {
    return NotificationService.send({
      userId,
      type: 'streak_danger',
      title: '🔥 ¡Tu racha está en peligro!',
      body: `No has hecho check-in en "${challengeTitle}" hoy. ¡Solo tienes hasta medianoche!`,
    });
  },

  welcome(userId: number, username: string) {
    return NotificationService.send({
      userId,
      type: 'system',
      title: '👋 ¡Bienvenido a Reto7!',
      body: `Hola ${username}, estás listo para construir hábitos imparables. ¡Explora los retos y empieza hoy!`,
    });
  },
};
