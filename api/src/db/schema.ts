import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  username: text('username').notNull().unique(),
  totalStreak: integer('total_streak').default(0),
  streakFreezesInventory: integer('streak_freezes_inventory').default(0),  streakFreezeGoldInventory: integer('streak_freeze_gold_inventory').default(0),
  streakFreezePlatinumInventory: integer('streak_freeze_platinum_inventory').default(0),  pushToken: text('push_token'),
  xp: integer('xp').default(0),
  level: integer('level').default(1),
  reminderTime: text('reminder_time').default('19:00'), // hora de recordatorio push
});

export const pushTokens = sqliteTable('push_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  platform: text('platform'),
  deviceLabel: text('device_label'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
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
  startsAt: integer('starts_at', { mode: 'timestamp' }), // nullable = empieza al unirse
  endsAt: integer('ends_at', { mode: 'timestamp' }),     // nullable = sin fecha fin
  maxParticipants: integer('max_participants'),           // nullable = ilimitado
});

export const userChallenges = sqliteTable('user_challenges', {
  userId: integer('user_id').notNull().references(() => users.id),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  currentStreak: integer('current_streak').default(0),
  status: text('status').default('active'), // pending | active | completed | failed
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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

export const nudgeEvents = sqliteTable('nudge_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderUserId: integer('sender_user_id').notNull().references(() => users.id),
  targetUserId: integer('target_user_id').notNull().references(() => users.id),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const shareableEvents = sqliteTable('shareable_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  dayNumber: integer('day_number').notNull(),
  imageUrl: text('image_url').notNull(),
  participantCount: integer('participant_count').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const challengeReports = sqliteTable('challenge_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  reporterUserId: integer('reporter_user_id').notNull().references(() => users.id),
  reason: text('reason').notNull(), // 'offensive' | 'dangerous' | 'discriminatory' | 'other'
  details: text('details'),
  isResolved: integer('is_resolved', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const checkInComments = sqliteTable('check_in_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  checkInId: integer('check_in_id').notNull().references(() => checkIns.id),
  userId: integer('user_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
