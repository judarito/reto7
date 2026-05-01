import { db } from './db';
import { challenges } from './db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function seed() {
  console.log('Seeding database...');
  try {
    await db.insert(challenges).values([
      {
        title: "10,000 Pasos Diarios",
        durationDays: 7,
        description: "Camina al menos 10,000 pasos todos los días para mantenerte activo.",
        isPremium: false,
        price: 0,
        evidenceDescription: "Sincroniza tu reloj o sube evidencia de tu caminata diaria.",
      },
      {
        title: "Cero Azúcar",
        durationDays: 14,
        description: "Elimina los azúcares añadidos de tu dieta por dos semanas completas.",
        isPremium: false,
        price: 0,
        evidenceDescription: "Sube una foto de una comida o bebida sin azúcares añadidos.",
      },
      {
        title: "Leer 10 Páginas",
        durationDays: 30,
        description: "Lee 10 páginas de cualquier libro no ficticio diariamente.",
        isPremium: true,
        price: 0.99,
        evidenceDescription: "Comparte una foto de la página o una nota breve de lo leído.",
      }
    ]);
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed().then(() => process.exit(0));
