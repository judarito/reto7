import { db } from '../db';
import { notifications, pushTokens, users } from '../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { sendPushNotification } from './firebase';

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

    // 2. Try to send push if user has a token
    try {
      const tokenRows = await db
        .select({ token: pushTokens.token })
        .from(pushTokens)
        .where(eq(pushTokens.userId, userId));

      const legacyUserRecord = await db
        .select({ pushToken: users.pushToken })
        .from(users)
        .where(eq(users.id, userId));

      const tokens = new Set<string>();
      tokenRows.forEach((row) => {
        if (row.token) tokens.add(row.token);
      });
      const legacyToken = legacyUserRecord[0]?.pushToken;
      if (legacyToken) tokens.add(legacyToken);

      if (tokens.size > 0) {
        const stringData = data
          ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
          : {};

        await Promise.allSettled(
          Array.from(tokens).map((token) => sendPushNotification(token, title, body, stringData))
        );
      }
    } catch (e) {
      console.error('Failed to send push notification:', e);
    }
  },

  async getUnreadCount(userId: number): Promise<number> {
    const unread = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(unread[0]?.count ?? 0);
  },
};

// --- Pre-built notification templates ---

export const NotificationTemplates = {
  nudge(targetUserId: number, senderUsername: string, challengeId: number) {
    return NotificationService.send({
      userId: targetUserId,
      type: 'nudge',
      title: '⚠️ ¡Alguien te envió un Nudge!',
      body: `${senderUsername} te recuerda que no pierdas tu racha hoy. ¡Muévete!`,
      data: { challengeId: String(challengeId) },
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

  streakDanger(userId: number, challengeTitle: string, challengeId: number) {
    return NotificationService.send({
      userId,
      type: 'streak_danger',
      title: '🔥 ¡Tu racha está en peligro!',
      body: `No has hecho check-in en "${challengeTitle}" hoy. ¡Solo tienes hasta medianoche!`,
      data: { challengeId: String(challengeId) },
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

  challengeCompleted(userId: number, challengeTitle: string, challengeId: number) {
    return NotificationService.send({
      userId,
      type: 'system',
      title: '🏆 ¡Reto completado!',
      body: `Terminaste "${challengeTitle}". Tu trofeo ya está en la vitrina.`,
      data: { challengeId: String(challengeId) },
    });
  },
};
