import { db } from './db';
import { users } from './db/schema';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

async function seedUser() {
  console.log('Creating test user...');
  try {
    const passwordHash = await bcrypt.hash('reto7pass', 10);

    await db.insert(users).values({
      email: 'atleta@reto7.com',
      username: 'atleta_pro',
      passwordHash,
      totalStreak: 7,
      streakFreezesInventory: 1,
    });

    console.log('✅ Usuario creado exitosamente!');
    console.log('');
    console.log('  Email:    atleta@reto7.com');
    console.log('  Password: reto7pass');
    console.log('');
  } catch (error: any) {
    if (error?.message?.includes('UNIQUE')) {
      console.log('ℹ️  El usuario ya existe en la base de datos.');
      console.log('');
      console.log('  Email:    atleta@reto7.com');
      console.log('  Password: reto7pass');
    } else {
      console.error('Error:', error);
    }
  }
}

seedUser().then(() => process.exit(0));
