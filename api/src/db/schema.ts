import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  username: text('username').notNull().unique(),
  totalStreak: integer('total_streak').default(0),
  streakFreezesInventory: integer('streak_freezes_inventory').default(0),
  pushToken: text('push_token'),
});

export const challenges = sqliteTable('challenges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  durationDays: integer('duration_days').notNull(),
  description: text('description'),
  isPremium: integer('is_premium', { mode: 'boolean' }).default(false),
  price: integer('price').default(0), // Using integer for cents to avoid floating point issues
  creatorId: integer('creator_id').references(() => users.id),
  isPrivate: integer('is_private', { mode: 'boolean' }).default(false),
  inviteCode: text('invite_code').unique(),
  evidenceDescription: text('evidence_description'), // e.g. "Sube 3 fotos comiendo sin gluten"
});

export const userChallenges = sqliteTable('user_challenges', {
  userId: integer('user_id').notNull().references(() => users.id),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  currentStreak: integer('current_streak').default(0),
  status: text('status').default('active'), // active, completed, failed
});

export const checkIns = sqliteTable('check_ins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  photoUrl: text('photo_url').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  checkInId: integer('check_in_id').notNull().references(() => checkIns.id),
  userId: integer('user_id').notNull().references(() => users.id),
  emojiType: text('emoji_type').notNull(), // e.g. 🔥, 💪, 👏
});

export const trophies = sqliteTable('trophies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  earnedAt: integer('earned_at', { mode: 'timestamp' }).notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // nudge | streak_danger | challenge_joined | new_member | system
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: text('data'), // JSON string for extra payload (e.g. challengeId)
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
