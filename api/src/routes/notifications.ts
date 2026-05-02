import { Router } from 'express';
import { db } from '../db';
import { notifications, pushTokens } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendPushNotification } from '../services/firebase';
import { NotificationTemplates } from '../services/notificationService';

const router = Router();

// GET /api/notifications — get all notifications for authenticated user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    const unreadCount = Number(unreadCountResult[0]?.count ?? 0);

    res.json({ notifications: userNotifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id as string, 10);

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/notifications/test — enviar notificación de prueba
router.post('/test', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Verificar si tiene tokens push registrados
    const tokenRows = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    // Enviar notificación de prueba
    await NotificationTemplates.welcome(userId, req.user!.username);

    const result = {
      message: 'Notificación enviada. Revisa tu bandeja de avisos 🔔',
      pushTokensCount: tokenRows.length,
      pushTokens: tokenRows.map(r => r.token.substring(0, 20) + '...'),
      dbNotification: true,
    };

    res.json(result);
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Error al enviar notificación de prueba' });
  }
});

export default router;
