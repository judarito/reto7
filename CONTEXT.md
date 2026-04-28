# Reto7 — Contexto de la Aplicación

## ¿Qué es Reto7?

**Reto7** es una aplicación móvil de retos fitness sociales enfocada en **streaks diarios** (rachas). El concepto central es simple: toma una foto como prueba de que completaste tu reto hoy, sube tu check-in, y mantén tu racha viva. Si fallas un día, pierdes la racha, a menos que tengas un "Escudo de Racha".

La app está diseñada para ser **viral por naturaleza**: los usuarios crean retos privados, generan un código secreto, y lo comparten con sus amigos para competir juntos en una tabla de clasificación.

---

## Stack Tecnológico

### Backend (`/api`)
| Tecnología | Propósito |
|---|---|
| Node.js + Express | Servidor HTTP y rutas REST |
| TypeScript | Tipado estático |
| Drizzle ORM | Consultas a la base de datos |
| Turso (libSQL) | Base de datos SQL en la nube (edge) |
| bcrypt | Hash seguro de contraseñas |
| jsonwebtoken | Autenticación stateless (JWT, 7 días) |
| multer | Subida de archivos (fotos de check-in) |
| expo-server-sdk | Envío de notificaciones push reales |
| dotenv | Gestión de variables de entorno |

### Frontend (`/mobile`)
| Tecnología | Propósito |
|---|---|
| React Native + Expo (SDK 54) | Framework móvil multiplataforma |
| TypeScript | Tipado estático |
| expo-router | Navegación por sistema de archivos |
| NativeWind (Tailwind CSS v4) | Estilado con clases utilitarias |
| Moti + Reanimated | Animaciones fluidas y microinteracciones |
| expo-secure-store | Almacenamiento seguro del JWT |
| expo-notifications + expo-device | Notificaciones push locales y remotas |
| react-native-purchases | Monetización con RevenueCat (IAP) |

---

## Diseño Visual

| Token | Valor |
|---|---|
| Background | `#121212` |
| Accent principal | `#39FF14` (Neon Green) |
| Accent secundario | `#FF5F1F` (Neon Orange) |
| Texto primario | `#FFFFFF` |
| Texto secundario | `#9CA3AF` (gray-400) |
| Tarjetas | `#1A1A1A` |

**Estética:** Dark Mode premium, minimalista y de alto contraste. Tipografía en mayúsculas y peso `font-black`. Microanimaciones de pulso en la flama de racha y animaciones de rebote en el Paywall.

---

## Estructura del Monorepo

```
Reto7/
├── api/                     # Backend
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts    # Esquema de la base de datos
│   │   │   └── index.ts     # Conexión a Turso
│   │   ├── middleware/
│   │   │   └── auth.ts      # Middleware JWT (authenticateToken)
│   │   ├── routes/
│   │   │   ├── auth.ts      # Registro, Login, Push Token
│   │   │   ├── challenges.ts # CRUD de retos, join, invite codes
│   │   │   ├── checkIns.ts  # Subida de fotos (multer)
│   │   │   ├── feed.ts      # Feed social + Nudge (con push real)
│   │   │   ├── store.ts     # Consume streak freeze
│   │   │   ├── webhooks.ts  # RevenueCat webhook
│   │   │   └── leaderboard.ts # Top 10 por reto
│   │   ├── index.ts         # Entry point, monta todas las rutas
│   │   └── seed.ts          # Script para poblar retos globales
│   ├── drizzle/             # Archivos de migración SQL generados
│   ├── drizzle.config.ts    # Configuración de Drizzle (dialecto: turso)
│   └── .env                 # Variables de entorno (NO commitear)
│
└── mobile/                  # Frontend
    ├── app/
    │   ├── _layout.tsx       # Layout raíz (dark theme)
    │   ├── index.tsx         # Pantalla Login / Registro
    │   ├── paywall.tsx       # Pantalla de compra del Escudo
    │   ├── camera.tsx        # Cámara (solo live photos)
    │   ├── create-challenge.tsx # Formulario crear reto
    │   ├── (tabs)/
    │   │   ├── _layout.tsx   # Barra de navegación inferior
    │   │   ├── dashboard.tsx # Dashboard principal con racha
    │   │   ├── feed.tsx      # Feed social
    │   │   ├── explore.tsx   # Retos globales + Unirse por código
    │   │   └── profile.tsx   # Perfil y sala de trofeos
    │   └── challenge/
    │       └── [id]/
    │           └── leaderboard.tsx # Tabla clasificación + Compartir código
    ├── components/
    │   ├── ReactionRow.tsx   # Botones 🔥 💪 👏 bajo las fotos
    │   └── NudgeSection.tsx  # Sección "EN PELIGRO" en el feed
    ├── services/
    │   └── healthSync.ts     # Mock de Apple Health / HealthConnect
    ├── hooks/
    │   └── usePushNotifications.ts # Hook para registrar push token
    ├── tailwind.config.js    # Colores custom (background, neonGreen, neonOrange)
    ├── babel.config.js       # Plugin de Reanimated
    └── metro.config.js       # Integración NativeWind
```

---

## Base de Datos (Turso)

### Tablas

#### `users`
| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | autoIncrement |
| email | text | unique, notNull |
| password_hash | text | bcrypt hash |
| username | text | unique, notNull |
| total_streak | integer | default 0 |
| streak_freezes_inventory | integer | default 0 |
| push_token | text | Expo push token |

#### `challenges`
| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | autoIncrement |
| title | text | Nombre del reto |
| duration_days | integer | Duración en días |
| description | text | nullable |
| is_premium | boolean | default false |
| price | integer | Centavos USD, default 0 |
| creator_id | integer | FK → users.id, nullable |
| is_private | boolean | default false |
| invite_code | text | unique, nullable (solo privados) |

#### `user_challenges`
| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | autoIncrement |
| user_id | integer | FK → users.id |
| challenge_id | integer | FK → challenges.id |
| current_streak | integer | default 0 |
| status | text | 'active' \| 'completed' |

#### `check_ins`
| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | autoIncrement |
| user_id | integer | FK → users.id |
| challenge_id | integer | FK → challenges.id |
| photo_url | text | Ruta de la foto |
| created_at | timestamp | Registro del check-in |

#### `reactions`
| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | autoIncrement |
| check_in_id | integer | FK → check_ins.id |
| user_id | integer | FK → users.id |
| emoji_type | text | '🔥', '💪', '👏' |

#### `trophies`
| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | autoIncrement |
| user_id | integer | FK → users.id |
| challenge_id | integer | FK → challenges.id |
| earned_at | timestamp | Fecha de completado |

---

## API Endpoints

### Autenticación (`/api/auth`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/register` | No | Crea usuario, retorna JWT |
| POST | `/login` | No | Verifica credenciales, retorna JWT |
| POST | `/push-token` | JWT | Guarda el Expo Push Token del usuario |

### Retos (`/api/challenges`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/global` | No | Lista todos los retos públicos |
| POST | `/join` | JWT | Une al usuario a un reto por ID |
| POST | `/create` | JWT | Crea un reto (público o privado con código) |
| POST | `/join-by-code` | JWT | Une al usuario a un reto privado por código |
| GET | `/:id` | JWT | Detalles de un reto específico |

### Check-ins (`/api/check-ins`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/upload` | JWT | Sube foto de prueba (multer) |

### Feed (`/api/feed`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/:challenge_id` | JWT | Feed del día de un reto |
| POST | `/reactions` | JWT | Agrega una reacción a un check-in |
| POST | `/nudge` | JWT | Envía notificación push real al usuario en peligro |

### Tienda (`/api/store`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/consume-freeze` | JWT | Gasta un Escudo para restaurar racha |

### Leaderboard (`/api/leaderboard`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/:challenge_id` | JWT | Top 10 usuarios por racha en un reto |

### Webhooks (`/api/webhooks`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/revenuecat` | No | Recibe eventos de compra y acredita Escudos |

---

## Flujos Principales

### Flujo de Registro
1. Usuario abre la app → pantalla de **Login**.
2. Toca "¿No tienes cuenta? Regístrate".
3. Ingresa **Username**, **Email** y **Password**.
4. El backend hashea la contraseña con bcrypt, inserta en Turso y retorna un JWT de 7 días.
5. El JWT se guarda en `expo-secure-store`.
6. El usuario es redirigido al **Dashboard**.

### Flujo de Crear Reto
1. Desde la pestaña **Explorar (🔍)**, toca el botón **"+ CREAR"**.
2. Llena el nombre, duración y activa/desactiva el Switch de "Reto Privado".
3. El backend crea el reto, genera un `inviteCode` (si es privado), y auto-suscribe al creador.
4. El Alert muestra el código secreto (ej. `FUEGO7`).

### Flujo de Invitar Amigos
1. Creador va al **Leaderboard** del reto → toca el botón naranja **"🔗 Invitar Amigos: FUEGO7"**.
2. Se abre el **Share Sheet nativo** del teléfono.
3. El amigo recibe el mensaje, abre la pestaña Explorar → escribe el código → toca **"Unirse"**.
4. El amigo aparece en el Leaderboard del reto privado.

### Flujo de Check-in Diario
1. Desde el **Dashboard**, el usuario toca "Subir Prueba 📸" en su reto.
2. Se abre la **cámara** (sin acceso a galería — solo live photos).
3. Toma la foto → se sube al backend vía `POST /api/check-ins/upload`.
4. La racha se incrementa en `user_challenges.current_streak`.

### Flujo de Racha Rota → Paywall
1. El usuario intenta acceder a un reto con el check-in atrasado.
2. La app redirige automáticamente al **Paywall**.
3. El escudo 3D cae con animación de rebote (Moti).
4. El usuario puede comprar un "Escudo de Racha" por $0.99 USD.
5. RevenueCat procesa el pago → envía webhook al backend → acredita 1 Escudo.
6. El usuario toca "Usar Escudo" → `POST /api/store/consume-freeze` → racha restaurada.

---

## Variables de Entorno

### Backend (`/api/.env`)
```env
TURSO_DATABASE_URL=libsql://tu-db.turso.io
TURSO_AUTH_TOKEN=tu-token-aqui
JWT_SECRET=tu-jwt-secret-super-seguro
```

### Frontend (`/mobile`)
No se requieren variables de entorno adicionales para desarrollo local.
Para producción, configurar el `projectId` de Expo en `app.json` y `usePushNotifications.ts`.

---

## Scripts Disponibles

### Backend
```bash
cd api
npm run dev        # Inicia servidor en modo desarrollo (ts-node-dev)
npm run db:generate # Genera archivos de migración SQL
npm run db:push    # Aplica el esquema directamente a Turso
npm run seed       # Popula la base de datos con retos globales base
```

### Frontend
```bash
cd mobile
npx expo start     # Inicia el servidor de desarrollo de Expo
npx expo start -c  # Inicia limpiando caché (recomendado después de cambios en babel/metro)
```

---

## Estado Actual y Próximos Pasos

### ✅ Completado
- Auth completo (register/login con bcrypt + JWT)
- Base de datos en Turso con todas las tablas
- Retos globales (seed) y creación de retos personalizados
- Invitaciones por código privado + Share Sheet nativo
- Feed social con reacciones (🔥 💪 👏)
- Nudges con notificaciones push reales (expo-server-sdk)
- Paywall con animación Moti (Escudo de Racha)
- Leaderboard por reto
- Health Sync mock (Apple Health / HealthConnect)
- Trofeos (tabla en DB, UI de grid en Profile)
- Animación de pulso en la flama del Dashboard

### 🔜 Próximos Pasos
- **EAS Build:** Compilar el `.apk` para pruebas en dispositivo físico (`eas build --profile preview --platform android`)
- **Notificaciones diarias programadas:** Cron job en el backend que a las 8:00 PM revisa usuarios sin check-in y les envía un push
- **Dashboard dinámico:** Conectar los retos del Dashboard con los datos reales de `user_challenges` del usuario autenticado
- **Almacenamiento de fotos:** Migrar de local (`/api/uploads`) a Cloudinary o AWS S3
- **Deep Linking:** Configurar `reto7://join/FUEGO7` para que los links de WhatsApp abran la app directo en el join
