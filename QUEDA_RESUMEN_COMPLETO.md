# queda. — Resumen Completo de la Aplicación

## 1. Concepto del Producto

**queda.** es una plataforma de descubrimiento social para conocer gente nueva a través de planes compartidos. Los usuarios crean planes (actividad, lugar, fecha, hora) y los publican. Otros usuarios los descubren, se unen y se conocen en persona. Es como Tinder pero para quedadas grupales.

**Flujo principal:** Registrarse → Completar perfil → Descubrir planes (feed o mapa) → Unirse → Chatear → Quedar

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + React Router | 18.2 / 7.13 |
| Bundler | Vite | 5.x |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime + Storage) | Client 2.39 |
| Mapas | Google Maps + Places API | JS API |
| Deploy | Vercel (SPA + Edge Middleware) | — |
| Testing | Playwright (e2e) | 1.58 |
| Monitoring | Sentry (@sentry/react) | 10.46 |
| PWA | Service Worker + manifest.json | — |

**No hay API custom.** Todo el backend es Supabase con RLS (Row Level Security). El único código serverless es un middleware de Vercel para generar meta tags OG dinámicos.

---

## 3. Estructura de Archivos

```
queda-app/
├── api/                    # (vacío, no hay serverless functions)
├── dist/                   # Build de producción
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker (cache v3)
│   ├── og.png              # Imagen Open Graph
│   └── icons/              # SVG icons (192x192, 512x512)
├── scripts/
│   └── simulate.mjs        # Script de seeding con bots de prueba
├── sql/
│   ├── migration_v2.sql    # Schema principal (tablas, RLS, funciones)
│   └── security_indexes_cascades.sql  # Índices y cascadas legacy
├── src/
│   ├── main.jsx            # Entry point (Sentry, SW, Google Maps loader)
│   ├── App.jsx             # Router, auth state, theme, lang, toast
│   ├── components/         # 13 componentes UI
│   │   ├── ui.jsx          # Btn, Inp, Txa, Lbl, Card, Back, Badge, HR, Stepper
│   │   ├── BottomNav.jsx   # Navegación inferior fija
│   │   ├── PlanCard.jsx    # Tarjeta de plan en feed
│   │   ├── FilterBar.jsx   # Filtros: categoría, fecha, distancia
│   │   ├── CalendarPicker.jsx  # Selector de fecha con calendario
│   │   ├── ClockPicker.jsx     # Selector de hora circular 24h
│   │   ├── CategoryPicker.jsx  # Grid de categorías con emojis
│   │   ├── PlaceSearch.jsx     # Búsqueda de lugares con Google Places
│   │   ├── CityInput.jsx       # Autocomplete de ciudades
│   │   ├── MapModal.jsx        # Modal de mapa a pantalla completa
│   │   ├── Chat.jsx            # Chat en tiempo real dentro de planes
│   │   └── FilterBar.jsx       # Barra de filtros
│   ├── pages/              # 8 páginas
│   │   ├── Landing.jsx     # Landing para no autenticados
│   │   ├── AuthScreen.jsx  # Login / Registro / Reset password
│   │   ├── ResetPasswordScreen.jsx  # Cambio de contraseña
│   │   ├── Profile.jsx     # Perfil propio + onboarding
│   │   ├── PublicProfile.jsx  # Perfil público de otros usuarios
│   │   ├── Feed.jsx        # Feed de planes (lista)
│   │   ├── MapFeed.jsx     # Feed de planes (mapa)
│   │   ├── Create.jsx      # Wizard de creación de plan
│   │   └── PlanDetail.jsx  # Detalle de plan + chat + participantes
│   ├── hooks/              # 3 hooks custom
│   │   ├── useGeolocation.js    # Geolocalización del usuario
│   │   ├── useRealtimeChat.js   # Chat realtime con Supabase
│   │   └── useFocusTrap.js      # Focus trap para modales
│   ├── lib/                # 4 librerías/servicios
│   │   ├── supabase.js     # Cliente Supabase + todas las operaciones DB
│   │   ├── auth.js         # Wrapper de autenticación
│   │   ├── utils.js        # Utilidades (fechas, IDs, formateo)
│   │   └── storage.js      # Wrapper de localStorage
│   └── constants/          # 3 archivos de constantes
│       ├── theme.js        # Paleta dark/light + helpers
│       ├── categories.js   # 16 categorías con emojis y traducciones
│       └── translations.js # i18n completo (6 idiomas, 100+ keys)
├── tests/
│   └── app.spec.js         # Tests e2e con Playwright
├── middleware.js            # Vercel Edge Middleware (OG tags dinámicos)
├── vercel.json              # Config de deploy (rewrites, CSP headers)
├── vite.config.js           # Config de Vite (React plugin, chunks)
├── package.json             # Dependencias y scripts
└── .env                     # Variables de entorno
```

---

## 4. Modelo de Datos (PostgreSQL via Supabase)

### Tabla: `profiles`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID (PK, FK → auth.users) | ID del usuario |
| name | TEXT | Nombre visible |
| username | TEXT (UNIQUE) | @handle |
| email | TEXT | Email |
| bio | TEXT | Biografía (max 300 chars en UI) |
| photo_url | TEXT | URL del avatar en Supabase Storage |
| birthdate | DATE | Fecha de nacimiento |
| gender | ENUM | male, female, non-binary, other, prefer_not_to_say |
| interests | TEXT[] | Array de slugs de categorías |
| city | TEXT | Ciudad del usuario |
| lat | FLOAT | Latitud |
| lng | FLOAT | Longitud |
| lang | TEXT | Idioma preferido |
| created_at | TIMESTAMPTZ | Fecha de registro |
| updated_at | TIMESTAMPTZ | Última actualización |

**Índices:** username (UNIQUE), interests (GIN)

### Tabla: `plans`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | TEXT (PK) | ID de 8 caracteres alfanuméricos |
| user_id | UUID (FK → auth.users) | Organizador |
| title | TEXT | Título del plan (max 100) |
| description | TEXT | Descripción opcional (max 500) |
| category | TEXT | Slug de categoría |
| place_name | TEXT | Nombre del lugar |
| place_address | TEXT | Dirección |
| lat | FLOAT | Latitud del lugar |
| lng | FLOAT | Longitud del lugar |
| date | DATE | Fecha del plan |
| time | TIME | Hora del plan |
| capacity | INT | Capacidad (2-20) |
| join_mode | TEXT | 'open' o 'closed' (requiere aprobación) |
| status | TEXT | active, full, cancelled, past |
| created_at | TIMESTAMPTZ | Fecha de creación |

**Índices:** date, status, category, user_id, location (lat+lng), created_at DESC

### Tabla: `plan_participants`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID (PK) | — |
| plan_id | TEXT (FK → plans) | — |
| user_id | UUID (FK → auth.users) | — |
| status | TEXT | joined, pending, rejected |
| created_at | TIMESTAMPTZ | — |

**Constraint:** UNIQUE (plan_id, user_id)
**Índices:** plan_id, user_id, status

### Tabla: `messages`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID (PK) | — |
| plan_id | TEXT (FK → plans) | — |
| user_id | UUID (FK → auth.users) | — |
| content | TEXT | Contenido del mensaje (max 1000 en UI) |
| created_at | TIMESTAMPTZ | — |

**Índice:** (plan_id, created_at)

### Funciones SQL
- `delete_plan(p_plan_id TEXT)` — SECURITY DEFINER, solo el organizador puede borrar
- `plan_joined_count(p_plan_id TEXT)` — Cuenta participantes con status 'joined'

---

## 5. Seguridad

### 5.1 Row Level Security (RLS)

**profiles:**
- SELECT: cualquier usuario autenticado puede leer cualquier perfil (público)
- INSERT: solo auth.uid() = id
- UPDATE: solo auth.uid() = id

**plans:**
- SELECT: usuarios autenticados pueden leer planes activos
- INSERT: solo auth.uid() = user_id (el organizador)
- UPDATE: solo auth.uid() = user_id
- DELETE: solo auth.uid() = user_id

**plan_participants:**
- SELECT: ver propia participación O participantes de planes que organizas
- INSERT: auth.uid() = user_id (autenticados pueden unirse)
- UPDATE: propio registro O organizador del plan (aprobar/rechazar)
- DELETE: auth.uid() = user_id (dejar el plan)

**messages:**
- SELECT: solo participantes con status 'joined' O el organizador
- INSERT: auth.uid() = user_id Y (participante joined O organizador)

### 5.2 Autenticación
- **Métodos:** Email/password + OAuth Google
- **Flujo:** PKCE (Proof Key for Code Exchange)
- **Sesiones:** Auto-refresh, persistidas en localStorage
- **Reset password:** Por email con redirect URL
- **Onboarding obligatorio:** Tras registro, requiere completar bio, birthdate e interests

### 5.3 Headers de Seguridad (vercel.json)
- **Content-Security-Policy:** Restringe scripts, styles, fonts, images, connections, frames
  - `script-src`: self + unsafe-inline + unsafe-eval + maps.googleapis.com
  - `frame-src`: none (sin iframes)
  - `object-src`: none
- **X-Frame-Options:** DENY (protección clickjacking)
- **X-Content-Type-Options:** nosniff
- **Referrer-Policy:** strict-origin-when-cross-origin

### 5.4 Notas de Seguridad
- `unsafe-eval` necesario para React/Google Maps
- `unsafe-inline` necesario para estilos inline
- No hay rate limiting visible (debería añadirse)
- No hay validación de tipo/tamaño de archivo en upload de avatar (depende de Supabase Storage)
- El service worker NO cachea llamadas API ni HTML/JS

---

## 6. Autenticación — Flujo Completo

```
1. Usuario llega a Landing → Click "Empezar"
2. AuthScreen → Modo login o registro
3. Registro: email + password (min 6 chars) → Supabase authSignUp
4. Confirmación por email → Click en link → Redirect a app
5. Login: email + password → Supabase authSignIn
6. OAuth: Google → authSignInWithProvider('google') → Redirect
7. App.jsx detecta sesión → Carga perfil
8. Si perfil incompleto (sin bio/birthdate/interests) → Redirect a Profile (onboarding)
9. Onboarding completado → Acceso completo al feed
10. Reset password: envía email → Link con token → ResetPasswordScreen
```

---

## 7. Rutas (React Router 7)

| Ruta | Página | Auth requerida | Descripción |
|------|--------|----------------|-------------|
| `/` | Feed | Sí | Lista de planes con filtros |
| `/map` | MapFeed | Sí | Mapa con planes marcados |
| `/create` | Create | Sí | Wizard de creación de plan |
| `/plan/:id` | PlanDetail | Sí | Detalle + chat + participantes |
| `/profile` | Profile | Sí | Perfil propio + settings |
| `/profile/:id` | PublicProfile | Sí | Perfil público de otro usuario |
| `/auth/callback` | (handler) | No | Callback de OAuth |

Sin auth → se muestra Landing + AuthScreen.

---

## 8. Funcionalidades por Módulo

### 8.1 Creación de Planes (Create.jsx)
- Título (max 100 chars)
- Categoría (16 opciones con emoji)
- Fecha (calendario, hasta 365 días adelante)
- Hora (reloj circular 24h)
- Lugar (búsqueda Google Places con mapa interactivo)
- Capacidad (2-20 personas, organizador cuenta como 1)
- Modo de unión: abierto (auto-join) o cerrado (requiere aprobación)
- Descripción opcional (max 500 chars)
- Al crear: genera ID de 8 chars, organizador auto-se-une
- Pantalla de éxito: compartir por WhatsApp, Telegram o copiar link

### 8.2 Descubrimiento (Feed.jsx + MapFeed.jsx)
- **Feed:** Lista vertical de PlanCards con filtros
- **MapFeed:** Google Maps con markers por categoría (emoji)
- **Filtros:** categoría, rango de fecha (hoy/semana/mes), distancia (<5/10/25/50 km)
- **Geolocalización:** Se pide permiso al filtrar por distancia
- **Cálculo de distancia:** Fórmula Haversine

### 8.3 Detalle de Plan (PlanDetail.jsx)
- Info: título, categoría, fecha, hora, lugar, organizador
- Participantes: lista de unidos + pendientes (si eres organizador)
- Acciones: unirse, solicitar unirse, dejar plan
- Organizador: aprobar/rechazar solicitudes
- Estado: plazas disponibles / completo
- **Realtime:** Suscripción a cambios en plan_participants

### 8.4 Chat en Tiempo Real (Chat.jsx + useRealtimeChat.js)
- Solo accesible para participantes unidos y organizador
- Mensajes en tiempo real via Supabase Realtime (postgres_changes INSERT)
- Agrupados por fecha (Hoy/Ayer/Fecha)
- Avatares, timestamps, alineación propia/ajena
- Max 1000 chars por mensaje
- Cache de perfiles para evitar refetches
- Auto-scroll al último mensaje

### 8.5 Perfiles (Profile.jsx + PublicProfile.jsx)
- **Editable:** foto, nombre, username (unique, alfanumérico), bio (300), birthdate, gender, ciudad (autocomplete), intereses, idioma
- **Público:** foto, nombre, edad, username, ciudad, bio, intereses, miembro desde
- **Avatar:** Upload a Supabase Storage, URL pública
- **Username:** Validación de duplicados, auto-lowercase, max 20 chars

### 8.6 Categorías (16)
| Emoji | Slug | Ejemplo |
|-------|------|---------|
| ☕ | cafe | Café |
| 🍽️ | food | Comida |
| 🍻 | drinks | Copas |
| ⚽ | sport | Deporte |
| 🥾 | hiking | Senderismo |
| 🎬 | cinema | Cine |
| 🎭 | culture | Cultura |
| 🎵 | music | Música |
| 🎮 | games | Juegos |
| 📚 | study | Estudio |
| ✈️ | travel | Viajes |
| 🧘 | wellness | Bienestar |
| 🛍️ | shopping | Compras |
| 🤝 | volunteer | Voluntariado |
| 🗣️ | languages | Idiomas |
| 📌 | other | Otro |

---

## 9. Internacionalización (i18n)

- **6 idiomas:** Español (es), English (en), Português (pt), Français (fr), Deutsch (de), Italiano (it)
- **Sistema:** Objeto `T` en `translations.js` con 100+ keys
- **Categorías:** Cada categoría tiene labels en los 6 idiomas
- **Fechas:** Formateo con `Intl.DateTimeFormat` y locales (es-ES, en-GB, pt-PT, fr-FR, de-DE, it-IT)
- **Persistencia:** Guardado en localStorage (`q_lang`) y en perfil de Supabase

---

## 10. Temas (Dark/Light)

### Dark Theme
```
Accent: #CDFF6C (verde lima)
Background: #0A0A0A (negro)
Card: #141414
Card2: #1C1C1C
Border: #2A2A2A
Text: #F0EBE1 (crema)
Muted: #999
```

### Light Theme
```
Accent: #4A8800 (verde bosque)
Background: #F5F4F1 (crema)
Card: #FFFFFF
Card2: #EEECE8
Border: #DDDAD3
Text: #1A1A1A
Muted: #666
```

- Detección automática de preferencia del sistema
- Toggle manual persistido en localStorage (`q_theme`)
- Body className: 'dark' o 'light'

---

## 11. PWA y Service Worker

- **manifest.json:** name "queda.", display standalone, theme #CDFF6C, bg #0A0A0A
- **Service Worker (sw.js):** Cache 'queda-v3'
  - Cachea: manifest, iconos, og.png (solo assets estáticos)
  - NO cachea: HTML, JS bundles, llamadas API
  - Estrategia: network-first para API

---

## 12. Edge Middleware (middleware.js)

- **Propósito:** Generar meta tags Open Graph dinámicos cuando se comparte un link de plan
- **Matcher:** `/plan/:id`
- **Flujo:**
  1. Intercepta petición a `/plan/:id`
  2. Fetch del plan desde Supabase REST API (con anon key)
  3. Genera HTML con og:title, og:description, og:image
  4. Cache: 5 minutos (max-age=300)
- **Protección:** Escape de HTML para prevenir XSS, cookie anti-loop

---

## 13. Operaciones de Base de Datos (supabase.js)

### Perfiles
- `loadProfile(uid)` — Cargar perfil propio
- `saveProfile(uid, prof)` — Upsert perfil
- `fetchPublicProfile(uid)` — Perfil público (sin email)
- `uploadAvatar(uid, file)` — Subir foto a Storage

### Planes
- `createPlan(plan)` — Crear plan
- `fetchPlan(id)` — Obtener plan con perfil del organizador
- `fetchPlans({category, dateFrom, dateTo, lat, lng, radiusKm, limit, offset})` — Buscar planes con filtros espaciales
- `updatePlan(id, fields)` — Actualizar plan
- `deletePlan(planId)` — Borrar via RPC (SECURITY DEFINER)

### Participantes
- `joinPlan(planId, userId)` — Auto-unirse (plan abierto)
- `requestJoin(planId, userId)` — Solicitar unirse (plan cerrado)
- `updateParticipant(planId, userId, status)` — Aprobar/rechazar
- `leavePlan(planId, userId)` — Dejar plan
- `fetchParticipants(planId)` — Listar con perfiles

### Mensajes
- `fetchMessages(planId, limit=50)` — Obtener mensajes con perfiles
- `sendMessage(planId, userId, content)` — Enviar mensaje

---

## 14. Testing (Playwright)

- **Config:** headless, chromium, timeout 45s, screenshots solo en fallo
- **Tests sin auth:** Landing renderiza, sin errores de consola, carga <5s, sin overflow horizontal a 320px
- **Tests con auth:** Login via SDK o UI, crear plan, navegar tabs, botones de voto, estado offline, URLs inválidas, modal con Escape

---

## 15. Rendimiento y Optimizaciones

- **Lazy loading:** Todas las páginas con `React.lazy` + `Suspense`
- **Google Maps:** Carga on-demand via `window.__loadGoogleMaps()`
- **Code splitting:** Chunk separado para `translations.js`
- **Debounce:** Búsquedas de lugar/ciudad debounced 300ms
- **Cache de perfiles:** useRef en hook de chat para evitar refetches
- **Geolocalización:** High accuracy desactivado (ahorro batería), cache 5min

---

## 16. Accesibilidad

- Focus trap en modales (useFocusTrap hook)
- Soporte de teclado: Tab, Shift+Tab, Escape, Enter
- Touch targets min 44px
- Safe-area-inset-bottom para notch
- aria-modal, role="dialog" en modales
- Alt text en imágenes

---

## 17. Deploy y CI/CD

- **Plataforma:** Vercel
- **Build:** `vite build` → dist/
- **Routing:** SPA rewrite `/(.*) → /index.html`
- **Middleware:** Edge function para OG tags
- **Scripts:** `npm run dev` (local), `npm run build` (prod), `npm test` (Playwright)

---

## 18. Variables de Entorno

| Variable | Uso | Tipo |
|----------|-----|------|
| VITE_SUPABASE_URL | URL del proyecto Supabase | Pública |
| VITE_SUPABASE_KEY | Anon key de Supabase | Pública (client-side) |
| VITE_GOOGLE_MAPS_KEY | API key de Google Maps | Pública (restringida) |
| VITE_SENTRY_DSN | DSN de Sentry | Pública |
| TEST_EMAIL | Email para tests e2e | Solo testing |
| TEST_PASSWORD | Password para tests e2e | Solo testing |

---

## 19. Resumen Ejecutivo

**queda.** es una SPA React desplegada en Vercel que usa Supabase como backend completo (auth, DB, realtime, storage). No tiene API custom — toda la lógica de acceso está protegida por RLS en PostgreSQL. Soporta 6 idiomas, dark/light mode, geolocalización, chat en tiempo real, y es una PWA instalable. El flujo principal es: registrarse → crear perfil → descubrir planes en feed/mapa → unirse → chatear → quedar con gente nueva.
