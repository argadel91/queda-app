# queda. — Resumen Completo para IA

**Ultima actualizacion:** 2026-04-14
**URL produccion:** https://www.queda.xyz
**Repo:** github.com/argadel91/queda-app

---

## 1. QUE ES QUEDA

**queda.** es una plataforma de descubrimiento social para conocer gente nueva a traves de planes compartidos. Los usuarios crean planes (actividad, lugar, fecha, hora) y los publican. Otros usuarios los descubren en un feed o mapa, se unen, chatean y quedan en persona.

**Flujo principal:** Registrarse → Completar perfil (onboarding) → Descubrir planes (feed/mapa) → Unirse a un plan → Chatear con el grupo → Quedar en persona

**No es:** una app de citas (no hay swipes ni matching). Es para quedadas grupales.

---

## 2. STACK TECNOLOGICO

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Frontend | React + React Router | 18.2 / 7.13 |
| Bundler | Vite | 5.x |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime + Storage) | Client 2.39 |
| Mapas | Google Maps + Places API | JS API |
| Deploy | Vercel (SPA + Edge Middleware) | Auto-deploy via git push |
| Testing | Playwright (e2e) | 1.58 |
| Monitoring | Sentry (@sentry/react) | 10.46 |
| PWA | Service Worker + manifest.json | Cache v3 |

**No hay API custom.** Todo el backend es Supabase con RLS. El unico codigo serverless es el middleware de Vercel para OG meta tags.

---

## 3. ESTRUCTURA DE ARCHIVOS

```
queda-app/
├── public/
│   ├── manifest.json          # PWA: name "queda.", standalone, theme #CDFF6C
│   ├── sw.js                  # Service Worker: cache v3, network-first para API
│   ├── og.png                 # Imagen Open Graph para compartir
│   └── icon-192.svg, icon-512.svg  # Iconos PWA (maskable)
├── scripts/
│   ├── simulate.mjs           # Seeding con bots de prueba (usa dotenv)
│   └── reset-db.mjs           # Borra toda la DB (usa service_role key)
├── sql/
│   ├── migration_v2.sql       # Schema principal: tables, RLS, funciones SQL
│   └── security_indexes_cascades.sql  # Indices legacy
├── tests/
│   └── app.spec.js            # 27 tests e2e con Playwright
├── src/
│   ├── main.jsx               # Entry: Sentry, SW, Google Maps loader
│   ├── App.jsx                # Router, auth, theme, lang, toast, AppProvider
│   ├── index.css              # Reset, animations, focus ring, skip link, responsive
│   ├── context/
│   │   └── AppContext.jsx     # React Context: c, lang, authUser, profile
│   ├── constants/
│   │   ├── theme.js           # Paleta dark/light, FS (font scale), SP (spacing)
│   │   ├── categories.js      # 16 categorias con emoji y labels en 6 idiomas
│   │   ├── status.js          # PLAN_STATUS, JOIN_STATUS, JOIN_MODE
│   │   └── translations.js    # i18n completo: 150+ keys × 6 idiomas
│   ├── lib/
│   │   ├── supabase.js        # Re-export barrel file
│   │   ├── supabase/
│   │   │   ├── client.js      # Instancia Supabase + toast helpers
│   │   │   ├── profiles.js    # loadProfile, saveProfile, fetchPublicProfile, uploadAvatar
│   │   │   ├── plans.js       # createPlan, fetchPlan, fetchPlans, updatePlan, deletePlan
│   │   │   ├── participants.js # joinPlan (RPC), requestJoin, updateParticipant, leavePlan
│   │   │   ├── messages.js    # fetchMessages, sendMessage
│   │   │   └── index.js       # Re-exports
│   │   ├── auth.js            # signUp, signIn, signOut, OAuth, resetPassword, getSession
│   │   ├── googleMaps.js      # Singleton loader: loadGoogleMaps, loadPlacesLib, loadMapsLib
│   │   ├── storage.js         # localStorage wrapper (ls.get/set/del)
│   │   └── utils.js           # genId, toISO, fmtDate, fmtShort, haversine, etc.
│   ├── hooks/
│   │   ├── useGeolocation.js  # Geolocalizacion + haversine
│   │   ├── useRealtimeChat.js # Chat realtime con Supabase channels
│   │   └── useFocusTrap.js    # Focus trap para modales
│   ├── components/
│   │   ├── ui.jsx             # Btn, Inp, Txa, Lbl, HR, Back, Badge, Card, Stepper
│   │   ├── BottomNav.jsx      # Nav inferior: Discover/Map/Create/Profile
│   │   ├── PlanCard.jsx       # Tarjeta de plan en feed
│   │   ├── FilterBar.jsx      # Filtros: categoria, fecha, distancia
│   │   ├── Chat.jsx           # Chat en tiempo real
│   │   ├── CalendarPicker.jsx # Selector de fecha con calendario
│   │   ├── ClockPicker.jsx    # Selector de hora circular 24h
│   │   ├── CategoryPicker.jsx # Grid de categorias con emojis
│   │   ├── PlaceSearch.jsx    # Busqueda de lugares con Google Places + mapa
│   │   ├── CityInput.jsx      # Autocomplete de ciudades
│   │   └── MapModal.jsx       # Portal fullscreen con mapa interactivo
│   └── pages/
│       ├── Landing.jsx        # Landing inmersiva: particulas, orbitas, phone mockup, contadores
│       ├── AuthScreen.jsx     # Login / Registro / Reset password
│       ├── ResetPasswordScreen.jsx  # Cambio de password (via recovery token)
│       ├── Profile.jsx        # Perfil propio + onboarding con progreso
│       ├── PublicProfile.jsx  # Perfil publico de otro usuario
│       ├── Feed.jsx           # Feed de planes (lista) con filtros y empty state
│       ├── MapFeed.jsx        # Feed de planes (mapa) con markers y hint
│       ├── Create.jsx         # Wizard de creacion con Stepper de 6 pasos
│       └── PlanDetail.jsx     # Detalle: info + participantes + chat + join/leave
├── middleware.js               # Vercel Edge: OG meta tags dinamicos para /plan/:id
├── vercel.json                 # CSP headers, SPA rewrite
├── vite.config.js              # React plugin, chunk splitting
├── index.html                  # Meta tags, fonts, viewport-fit=cover
└── .env                        # Variables de entorno (no en git)
```

---

## 4. MODELO DE DATOS

### Tabla: `profiles`
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID (PK, FK → auth.users) | ID del usuario |
| name | TEXT | Nombre visible |
| username | TEXT (UNIQUE) | @handle unico |
| email | TEXT | Email |
| bio | TEXT | Biografia (max 300 en UI) |
| photo_url | TEXT | URL del avatar en Supabase Storage |
| birthdate | DATE | Fecha de nacimiento |
| gender | TEXT | male/female/non-binary/other/prefer_not_to_say |
| interests | TEXT[] | Array de slugs de categorias |
| city | TEXT | Ciudad |
| lat, lng | DOUBLE PRECISION | Coordenadas |
| lang | TEXT | Idioma preferido |
| created_at, updated_at | TIMESTAMPTZ | Timestamps |

### Tabla: `plans`
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | TEXT (PK) | ID de 10 chars alfanumericos (genId) |
| user_id | UUID (FK → auth.users) | Organizador |
| title | TEXT | Titulo (max 100) |
| description | TEXT | Descripcion opcional (max 500) |
| category | TEXT | Slug de categoria |
| place_name, place_address | TEXT | Nombre y direccion del lugar |
| lat, lng | DOUBLE PRECISION | Coordenadas |
| date | DATE | Fecha del plan |
| time | TIME | Hora |
| capacity | INT | Capacidad 2-20 |
| join_mode | TEXT | 'open' o 'closed' |
| status | TEXT | active/full/cancelled/past |
| created_at | TIMESTAMPTZ | — |

### Tabla: `plan_participants`
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID (PK) | — |
| plan_id | TEXT (FK → plans CASCADE) | — |
| user_id | UUID (FK → auth.users CASCADE) | — |
| status | TEXT | joined/pending/rejected |
| created_at | TIMESTAMPTZ | — |

UNIQUE(plan_id, user_id)

### Tabla: `messages`
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID (PK) | — |
| plan_id | TEXT (FK → plans CASCADE) | — |
| user_id | UUID (FK → auth.users CASCADE) | — |
| content | TEXT (max 2000) | Contenido del mensaje |
| created_at | TIMESTAMPTZ | — |

### Funciones SQL
- `join_plan(p_plan_id, p_user_id, p_status)` — SECURITY DEFINER con SELECT FOR UPDATE para prevenir race conditions de capacidad. Actualiza status a 'full' automaticamente.
- `delete_plan(p_plan_id)` — SECURITY DEFINER, solo el organizador puede borrar
- `plan_joined_count(p_plan_id)` — Cuenta participantes joined
- Cron job: `mark-past-plans` ejecuta diariamente a las 01:00 UTC para marcar planes pasados

---

## 5. SEGURIDAD

### RLS (Row Level Security)
- **profiles:** Solo autenticados pueden leer. Insert/update solo propio.
- **plans:** Autenticados leen active/full. CRUD solo organizador.
- **plan_participants:** Ver propia participacion o participantes de tus planes. Insert con auth.uid(). Delete solo propio. Update propio o como organizador.
- **messages:** Solo participantes joined + organizador pueden leer/escribir.

### Auth
- PKCE flow, auto-refresh, session en localStorage
- Email/password + OAuth Google
- Reset password via email con redirect a /reset-password
- Validacion: password min 8 chars, email format

### Headers (vercel.json)
- CSP estricto: frame-src none, object-src none
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### Validaciones
- Avatar upload: solo JPG/PNG/WebP, max 2MB
- Plan ID en middleware: validado con regex `^[A-Za-z0-9]{6,12}$`
- Mensajes: CHECK constraint max 2000 chars en DB
- genId: usa crypto.getRandomValues (10 chars, filtra bad words)
- Join plan: RPC con FOR UPDATE previene race conditions de capacidad

---

## 6. RUTAS

| Ruta | Pagina | Auth | Descripcion |
|------|--------|------|-------------|
| `/` | Feed | Si | Lista de planes con filtros |
| `/map` | MapFeed | Si | Mapa con planes marcados |
| `/create` | Create | Si | Wizard de creacion (6 pasos) |
| `/plan/:id` | PlanDetail | Si | Detalle + chat + participantes |
| `/profile` | Profile | Si | Perfil propio + settings |
| `/profile/:id` | PublicProfile | Si | Perfil publico |
| `/reset-password` | ResetPasswordScreen | Si* | Cambio de password (*via recovery token) |
| `/auth/callback` | (handler) | No | OAuth callback |

Sin auth → Landing inmersiva → click CTA → AuthScreen

---

## 7. FUNCIONALIDADES

### Landing (Landing.jsx)
- Canvas con particulas emoji flotantes que se repelen con el raton
- Conexiones multicolor entre particulas cercanas
- Fondo con 5 blobs de gradiente animados + grain overlay
- Hero con titulo letra a letra y punto verde lima
- 3 anillos orbitales de emojis girando
- Phone mockup con carousel de cards que rotan cada 3s + tilt 3D
- Contadores animados al hacer scroll (2847 planes, 1203 personas, 16 categorias)
- CTA con palabras que aparecen una a una
- Todo traducido en 6 idiomas

### Crear Plan (Create.jsx)
- Wizard de 6 pasos con Stepper visual: Titulo → Categoria → Fecha → Hora → Lugar → Detalles
- CalendarPicker (hasta 365 dias adelante)
- ClockPicker circular 24h con AM/PM
- PlaceSearch con Google Places + mapa interactivo
- Capacidad 2-20, modo open/closed
- Descripcion opcional con contador X/500
- Pantalla de exito: share WhatsApp/Telegram/Copy con toast "Link copied"

### Feed (Feed.jsx)
- Lista vertical de PlanCards
- Filtros: categoria (dropdown accesible), fecha (hoy/semana/mes), distancia (<5/10/25/50km)
- Geolocalizacion con haversine
- Empty state con CTA "Crear un plan"
- Loading spinner con aria-live

### Mapa (MapFeed.jsx)
- Google Maps con markers (emoji + circulo)
- Click en marker → InfoWindow con detalles (HTML escaped contra XSS)
- Hint "Toca un pin para ver el plan" que desaparece en 3s
- Mismos filtros que Feed
- Dark mode styling para el mapa

### Detalle de Plan (PlanDetail.jsx)
- Info: emoji, titulo, categoria, fecha, hora, lugar, capacidad
- Organizador: avatar, nombre, username, ciudad
- Participantes: lista joined + pendientes (si organizador)
- Chat tab (solo para joined/organizador) con realtime
- Join/Request/Leave con confirmacion
- Aprobacion/rechazo de solicitudes (organizador)
- Share: WhatsApp, Telegram, Copy link con toast

### Chat (Chat.jsx + useRealtimeChat.js)
- Mensajes en tiempo real via Supabase postgres_changes
- Agrupados por fecha (Hoy/Ayer/fecha)
- Avatares, timestamps, burbuja propia vs ajena
- Reconexion automatica con banner "Reconectando..."
- Max 1000 chars, Enter para enviar

### Perfil (Profile.jsx)
- Vista: avatar, nombre+edad, username, ciudad, bio, intereses, genero
- Edicion: foto upload (validacion tipo/tamano), nombre, username (unique check), bio (300 chars), birthdate, genero, ciudad (autocomplete), intereses, idioma
- Onboarding: barra de progreso 3/3 (nombre, birthdate, intereses)
- Toast "Profile saved" al guardar
- Confirmacion al cerrar sesion

### Autenticacion (AuthScreen.jsx + auth.js)
- Login email/password, registro, reset password
- OAuth Google
- Confirmacion por email
- Onboarding obligatorio al registrarse

---

## 8. INTERNACIONALIZACION

- **6 idiomas:** es, en, pt, fr, de, it
- **150+ keys** en translations.js
- **Categorias** con labels en 6 idiomas
- **Fechas** formateadas con Intl.DateTimeFormat y locales
- **Persistencia:** localStorage (q_lang) + campo lang en perfil
- **Landing** con traducciones propias (LT object)

---

## 9. TEMAS (Dark/Light)

**Dark:** Accent #CDFF6C (lima), BG #0A0A0A, Card #141414, Text #F0EBE1, Muted #999
**Light:** Accent #4A8800 (verde), BG #F5F4F1, Card #FFFFFF, Text #1A1A1A, Muted #595959

- Toggle manual en header, persistido en localStorage
- Deteccion automatica del sistema
- Escala tipografica: xs(12) sm(14) md(16) lg(20) xl(24) xxl(32)
- Spacing grid: 4/8/12/16/20/24/32/40px

---

## 10. PWA

- manifest.json: standalone, theme #CDFF6C, iconos SVG maskable
- Service Worker: cache v3, network-first para API, cache-first para assets
- viewport-fit=cover para safe areas

---

## 11. MIDDLEWARE (middleware.js)

- Intercepta `/plan/:id` para generar OG meta tags dinamicos
- Fetch del plan desde Supabase REST API
- HTML con og:title, og:description, og:image, twitter:card
- Cache 5 minutos, escape HTML contra XSS
- Cookie anti-loop, validacion de formato de ID

---

## 12. ACCESIBILIDAD

- Landmarks semanticos: `<header>`, `<main>`, `<nav>`
- Skip link "Skip to content" visible con Tab
- Focus ring via :focus-visible (outline 2px)
- aria-live en toast (polite) y loading (assertive)
- aria-label en BottomNav, FilterBar dropdown, lang picker
- `<label htmlFor>` en formularios (Create, Profile)
- Focus trap en modales (ClockPicker)
- Touch targets minimo 44px (BottomNav, FilterBar, Profile lang)
- Safe area insets (bottom, left, right) para notch

---

## 13. TESTING

- **27 tests** Playwright e2e en 7 suites
- **Landing:** render, errores, performance, responsive, CTA
- **Auth:** registro, login valido/invalido, sin auth
- **Create:** navegacion, validacion, campos
- **Feed:** carga, filtros, navegacion
- **Plan Detail:** cards, organizador, chat tab, URL invalida (con fixture beforeAll/afterAll)
- **Profile:** info, edicion, persistencia, idiomas
- **Errors:** 404, plan inexistente, offline recovery
- **Helper:** loginViaSDK con auto-onboarding del perfil

---

## 14. DEPLOY

- **Plataforma:** Vercel con auto-deploy desde git push (main)
- **Build:** `vite build` → dist/
- **Routing:** SPA rewrite `/(.*) → /index.html`
- **Middleware:** Edge function para OG tags
- **Scripts:** `npm run dev`, `npm run build`, `npm test`

---

## 15. VARIABLES DE ENTORNO

| Variable | Uso |
|----------|-----|
| VITE_SUPABASE_URL | URL del proyecto Supabase |
| VITE_SUPABASE_KEY | Anon key (client-side) |
| VITE_GOOGLE_MAPS_KEY | Google Maps API key |
| VITE_SENTRY_DSN | Sentry error tracking |
| SUPABASE_URL | Para scripts (fallback a VITE_) |
| SUPABASE_ANON_KEY | Para scripts |
| SUPABASE_SERVICE_ROLE_KEY | Para scripts admin (reset-db) |
| TEST_EMAIL | Email cuenta de test |
| TEST_PASSWORD | Password cuenta de test |

---

## 16. DEPENDENCIAS

**Produccion:** react 18.2, react-dom 18.2, react-router-dom 7.13, @supabase/supabase-js 2.39, @sentry/react 10.46, html2canvas 1.4
**Dev:** vite 5.0, @vitejs/plugin-react 4.2, @playwright/test 1.58, dotenv 17.3, canvas 3.2
