import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// RevenueCat webhook receiver
router.post('/revenuecat', async (req, res) => {
  try {
    const configuredAuth = process.env.REVENUECAT_WEBHOOK_AUTH;
    const authorizationHeader = req.headers.authorization;

    if (!configuredAuth) {
      return res.status(503).send('RevenueCat webhook auth is not configured');
    }

    if (authorizationHeader !== `Bearer ${configuredAuth}`) {
      return res.status(401).send('Unauthorized');
    }

    const event = req.body.event;

    if (!event) {
      return res.status(400).send('No event provided');
    }

    if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL' || event.type === 'NON_RENEWING_PURCHASE') {
      const appUserId = event.app_user_id; // Usually mapped to our internal user ID

      if (event.product_id === 'streak_freeze_1') {
        const userRecord = await db.select().from(users).where(eq(users.id, parseInt(appUserId, 10)));
        if (userRecord.length > 0) {
          const currentInventory = userRecord[0].streakFreezesInventory || 0;
          await db.update(users).set({ streakFreezesInventory: currentInventory + 1 }).where(eq(users.id, parseInt(appUserId, 10)));
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Server error');
  }
});

export default router;
