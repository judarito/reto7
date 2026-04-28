import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../db';
import { checkIns, userChallenges, users } from '../db/schema';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';

const router = Router();

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, (req as AuthRequest).user!.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/upload', authenticateToken, upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { challengeId } = req.body;
    
    if (!req.file || !challengeId) {
      return res.status(400).json({ error: 'Photo and challengeId are required' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    // Insert check-in
    await db.insert(checkIns).values({
      userId,
      challengeId: parseInt(challengeId, 10),
      photoUrl,
      createdAt: new Date(),
    });

    // Increment streak in userChallenges
    const userChallenge = await db
      .select()
      .from(userChallenges)
      .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, parseInt(challengeId, 10))));

    if (userChallenge.length > 0) {
      await db
        .update(userChallenges)
        .set({ currentStreak: (userChallenge[0].currentStreak || 0) + 1 })
        .where(and(eq(userChallenges.userId, userId), eq(userChallenges.challengeId, parseInt(challengeId, 10))));
    }

    // Also increment global streak just for MVP
    const userRecord = await db.select().from(users).where(eq(users.id, userId));
    if (userRecord.length > 0) {
      await db
        .update(users)
        .set({ totalStreak: (userRecord[0].totalStreak || 0) + 1 })
        .where(eq(users.id, userId));
    }

    res.json({ message: 'Check-in successful', photoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
