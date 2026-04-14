# queda. — Resumen Completo para IA

**Ultima actualizacion:** 2026-04-14
**URL produccion:** https://www.queda.xyz
**Repo:** github.com/argadel91/queda-app
**Deploy:** Vercel (auto-deploy via git push a main)

---

## 1. QUE ES QUEDA

**queda.** es una plataforma de descubrimiento social para conocer gente nueva a traves de planes compartidos. Los usuarios crean planes (actividad, lugar, fecha, hora) y los publican. Otros usuarios los descubren en un feed o mapa, se unen, chatean en tiempo real y quedan en persona.

**Flujo principal:** Registrarse → Completar perfil (onboarding obligatorio: nombre + birthdate + intereses) → Descubrir planes (feed o mapa) → Unirse → Chatear → Quedar en persona

**No es** una app de citas. No hay swipes ni matching. Es para quedadas grupales espontaneas.

---

## 2. STACK TECNOLOGICO

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Frontend | React + React Router | 18.2 / 7.13 |
| Bundler | Vite | 5.x |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime + Storage) | Client 2.39 |
| Mapas | Google Maps + Places API | JS API (carga lazy) |
| Deploy | Vercel (SPA + Edge Middleware) | Auto-deploy via git |
| Testing | Playwright (e2e, chromium) | 1.58 |
| Monitoring | Sentry (@sentry/react) | 10.46 |
| PWA | Service Worker + manifest.json | Cache v3 |

**No hay API custom.** Todo el backend es Supabase con RLS (Row Level Security). El unico codigo serverless es el middleware de Vercel para meta tags OG dinamicos al compartir links de planes.

---

## 3. ESTRUCTURA DE ARCHIVOS

```
queda-app/
├── index.html                  # Meta OG, fonts (Syne+DM Sans), viewport-fit=cover
├── package.json                # 5 deps prod, 5 dev
├── vite.config.js              # React plugin, chunk split para translations
├── vercel.json                 # CSP headers, SPA rewrite
├── playwright.config.js        # Chromium, 45s timeout, localhost:5173
├── middleware.js                # Edge: OG meta tags para /plan/:id
├── public/
│   ├── manifest.json           # PWA: standalone, theme #CDFF6C
│   ├── sw.js                   # Cache v3, network-first para API
│   ├── og.png                  # Imagen para compartir
│   └── icon-192.svg, icon-512.svg  # Iconos PWA maskable
├── sql/
│   └── migration_v2.sql        # Schema: 4 tablas, RLS, funciones SQL, cron
├── scripts/
│   ├── reset-db.mjs            # Borra toda la DB (service_role key)
│   └── simulate.mjs            # Seeding con bots de prueba
├── tests/
│   └── app.spec.js             # 27 tests e2e Playwright
└── src/
    ├── main.jsx                # Sentry, SW, Google Maps loader
    ├── App.jsx                 # Router, auth state, theme, lang, toast, AppProvider
    ├── index.css               # Reset, animations, focus ring, skip link, responsive
    ├── context/
    │   └── AppContext.jsx      # Context: { c, lang, authUser, profile }
    ├── constants/
    │   ├── theme.js            # Paleta dark/light, FS (font scale), SP (spacing grid)
    │   ├── categories.js       # 16 categorias: emoji + labels en 6 idiomas
    │   ├── status.js           # PLAN_STATUS, JOIN_STATUS, JOIN_MODE
    │   └── translations.js     # 103 keys × 6 idiomas (24KB)
    ├── lib/
    │   ├── supabase.js         # Re-export barrel
    │   ├── supabase/
    │   │   ├── client.js       # Instancia Supabase + toast helpers (showErr, showToast)
    │   │   ├── profiles.js     # loadProfile, saveProfile, fetchPublicProfile, uploadAvatar
    │   │   ├── plans.js        # createPlan, fetchPlan, fetchPlans, updatePlan, deletePlan
    │   │   ├── participants.js # joinPlan (RPC), requestJoin, updateParticipant, leavePlan
    │   │   ├── messages.js     # fetchMessages, sendMessage
    │   │   └── index.js        # Re-exports
    │   ├── auth.js             # signUp, signIn, signOut, OAuth Google, resetPassword
    │   ├── googleMaps.js       # Singleton lazy loader: loadGoogleMaps, loadPlacesLib, loadMapsLib
    │   ├── storage.js          # localStorage wrapper: ls.get/set/del
    │   └── utils.js            # genId (crypto, 10 chars), fmtDate, fmtShort, haversine, etc.
    ├── hooks/
    │   ├── useGeolocation.js   # { location, error, loading, request } + haversine()
    │   ├── useRealtimeChat.js  # { messages, loading, reconnecting, sendMessage }
    │   └── useFocusTrap.js     # Focus trap para modales (Tab/Shift+Tab/Escape)
    ├── components/
    │   ├── ui.jsx              # Btn (primary/secondary/danger), Inp, Txa, Lbl, Back, Badge, Card, Stepper
    │   ├── BottomNav.jsx       # Nav inferior: Discover/Map/Create/Profile (44px touch, safe area)
    │   ├── PlanCard.jsx        # Tarjeta de plan en feed (emoji, titulo, fecha, spots)
    │   ├── FilterBar.jsx       # Filtros: categoria (dropdown a11y), fecha, distancia
    │   ├── Chat.jsx            # Chat realtime: burbujas, avatares, fechas, reconnecting
    │   ├── CalendarPicker.jsx  # Calendario mensual, seleccion de fecha
    │   ├── ClockPicker.jsx     # Reloj circular 24h con focus trap
    │   ├── CategoryPicker.jsx  # Grid de 16 categorias con emojis
    │   ├── PlaceSearch.jsx     # Google Places + mapa interactivo (debounce 300ms)
    │   ├── CityInput.jsx       # Autocomplete de ciudades
    │   └── MapModal.jsx        # Portal fullscreen con mapa, busqueda, seleccion
    └── pages/
        ├── Landing.jsx         # Landing inmersiva: particulas canvas, orbitas emoji, phone mockup
        ├── AuthScreen.jsx      # Login / Registro / Reset password + OAuth Google
        ├── ResetPasswordScreen.jsx  # Cambio de password (via recovery token, min 8 chars)
        ├── Profile.jsx         # Perfil: vista/edicion + onboarding con barra de progreso
        ├── PublicProfile.jsx   # Perfil publico de otro usuario (read-only)
        ├── Feed.jsx            # Feed de planes con filtros + empty state con CTA
        ├── MapFeed.jsx         # Mapa con markers + hint "Toca un pin" + dark mode
        ├── Create.jsx          # Wizard 6 pasos con Stepper + contador chars + share
        └── PlanDetail.jsx      # Detalle: info + participantes + chat + join/leave + share
```

---

## 4. MODELO DE DATOS (PostgreSQL via Supabase)

### profiles
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK (FK auth.users) | — |
| name, username (UNIQUE) | TEXT | — |
| email | TEXT | — |
| bio | TEXT | max 300 en UI |
| photo_url | TEXT | Supabase Storage, max 2MB JPG/PNG/WebP |
| birthdate | DATE | — |
| gender | TEXT | male/female/non-binary/other/prefer_not_to_say |
| interests | TEXT[] | Array de slugs de categorias |
| city | TEXT | — |
| lat, lng | DOUBLE PRECISION | Coordenadas |
| lang | TEXT | Idioma preferido |
| created_at, updated_at | TIMESTAMPTZ | — |

**RLS:** Autenticados leen. Insert/update solo propio.

### plans
| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | 10 chars alfanumericos (genId, crypto, bad words filter) |
| user_id | UUID FK auth.users CASCADE | Organizador |
| title | TEXT | max 100 |
| description | TEXT | max 500, opcional |
| category | TEXT | Slug de categoria |
| place_name, place_address | TEXT | — |
| lat, lng | DOUBLE PRECISION | — |
| date | DATE | — |
| time | TIME | — |
| capacity | INT | 2-20 (CHECK constraint) |
| join_mode | TEXT | 'open' o 'closed' |
| status | TEXT | active/full/cancelled/past |
| created_at | TIMESTAMPTZ | — |

**RLS:** Autenticados leen active/full. CRUD solo organizador.

### plan_participants
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | — |
| plan_id | TEXT FK plans CASCADE | — |
| user_id | UUID FK auth.users CASCADE | — |
| status | TEXT | joined/pending/rejected |
| created_at | TIMESTAMPTZ | — |

**UNIQUE**(plan_id, user_id). **RLS:** Ver propia participacion o de tus planes. Join con auth.uid(). Update propio u organizador.

### messages
| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID PK | — |
| plan_id | TEXT FK plans CASCADE | — |
| user_id | UUID FK auth.users CASCADE | — |
| content | TEXT | CHECK max 2000 chars |
| created_at | TIMESTAMPTZ | — |

**RLS:** Solo participantes joined + organizador leen/escriben.

### Funciones SQL
- **`join_plan(p_plan_id, p_user_id, p_status)`** — SECURITY DEFINER. SELECT FOR UPDATE para evitar race conditions. Verifica capacidad, inserta participante, actualiza status a 'full' si se llena.
- **`delete_plan(p_plan_id)`** — SECURITY DEFINER. Solo organizador puede borrar.
- **`plan_joined_count(p_plan_id)`** — Cuenta participantes joined.

### Cron
- `mark-past-plans`: diario a 01:00 UTC, marca planes con fecha pasada como 'past'.

### Realtime
- Habilitado en `messages` y `plan_participants` para chat y actualizaciones de participantes en tiempo real.

---

## 5. SEGURIDAD

### RLS (Row Level Security)
Todas las tablas tienen RLS habilitado. Acceso controlado por `auth.uid()` y EXISTS checks a nivel de PostgreSQL. No se puede bypassear desde el frontend.

### Auth
- PKCE flow (Proof Key for Code Exchange)
- Auto-refresh de tokens, sesion en localStorage
- Email/password + OAuth Google
- Reset password via email → /reset-password (min 8 chars)
- Validacion: email format, password length

### Headers (vercel.json)
- CSP estricto: frame-src none, object-src none
- X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### Validaciones
- Avatar: solo JPG/PNG/WebP, max 2MB (frontend + Storage policies)
- Plan ID en middleware: regex `^[A-Za-z0-9]{6,12}$`
- Mensajes: CHECK constraint max 2000 chars en DB
- genId: `crypto.getRandomValues` (10 chars, filtra bad words)
- Join plan: RPC con FOR UPDATE previene race conditions
- HTML escape en InfoWindows del mapa (XSS prevention)

---

## 6. RUTAS

| Ruta | Pagina | Descripcion |
|------|--------|-------------|
| `/` | Feed | Lista de planes con filtros (categoria, fecha, distancia) |
| `/map` | MapFeed | Mapa Google con markers de planes |
| `/create` | Create | Wizard de creacion (6 pasos con Stepper) |
| `/plan/:id` | PlanDetail | Detalle + chat + join/leave + participantes |
| `/profile` | Profile | Perfil propio: vista/edicion + onboarding |
| `/profile/:id` | PublicProfile | Perfil publico de otro usuario |
| `/reset-password` | ResetPasswordScreen | Cambio de password via recovery token |
| `/auth/callback` | (handler) | OAuth callback, exchange code for session |

Sin auth → Landing inmersiva → CTA → AuthScreen (login/registro)

---

## 7. FUNCIONALIDADES POR PANTALLA

### Landing (Landing.jsx — 466 lineas)
- Canvas con particulas emoji que se repelen con el raton y conectan con lineas multicolor
- 5 blobs de gradiente animados (violeta, azul, verde, burdeos, teal) + grain overlay
- Hero con titulo letra a letra y punto verde lima animado
- 3 anillos orbitales de emojis girando a distintas velocidades
- Phone mockup con carousel de 5 cards rotando cada 3s + tilt 3D con raton
- Contadores animados al scroll: 2847 planes, 1203 personas, 16 categorias
- CTA final con palabras que aparecen una a una + fondo que se intensifica
- 6 iconos de features con hover animado
- Todo traducido en 6 idiomas (objeto LT interno)
- Cleanup completo de RAF, intervals, listeners en useEffect returns

### Auth (AuthScreen.jsx — 177 lineas)
- Tabs: Sign in / Register
- Email + password (min 6 chars) + show/hide toggle
- Modo reset: introduce email → envio de link
- OAuth Google
- Confirmacion de email tras registro (pantalla con 📧)
- Errores traducidos: credenciales invalidas, email ya registrado, conexion

### Crear Plan (Create.jsx — 183 lineas)
- Stepper visual de 6 pasos que avanza automaticamente al llenar campos
- Titulo (max 100) → Categoria (16 opciones) → Fecha (CalendarPicker, max 365 dias) → Hora (ClockPicker 24h) → Lugar (PlaceSearch con mapa) → Capacidad (2-20) + Modo (open/closed) + Descripcion (max 500 con contador)
- Validacion: boton disabled hasta completar campos obligatorios
- Al crear: genId, insert plan, auto-join organizador
- Pantalla de exito: share WhatsApp/Telegram/Copy link (toast "Link copied")

### Feed (Feed.jsx — 104 lineas)
- Lista vertical de PlanCards
- FilterBar: categoria (dropdown accesible con Escape), fecha (hoy/semana/mes), distancia (<5/10/25/50km)
- Geolocalizacion con haversine para distancias
- Empty state con emoji 📌 + titulo + subtitulo + boton CTA "Crear un plan"
- Loading spinner con aria-live

### Mapa (MapFeed.jsx — 189 lineas)
- Google Maps con markers (emoji + circulo accent)
- Click marker → InfoWindow (HTML escaped) → click → PlanDetail
- Hint "Toca un pin para ver el plan" (3s, desaparece)
- Dark mode styling para el mapa
- Mismos filtros que Feed

### Detalle Plan (PlanDetail.jsx — 290 lineas)
- Info: emoji, titulo, categoria, fecha, hora, lugar (ellipsis), capacidad
- Organizador: avatar, nombre, username (muted), ciudad
- Participantes: lista joined + pendientes (si organizador)
- Chat tab (solo joined/organizador): Chat.jsx con realtime
- Join (open) / Request (closed) / Leave con confirm()
- Aprobacion/rechazo de solicitudes (organizador)
- Share: WhatsApp, Telegram, Copy (toast "Link copied")
- Spots left / Full indicator
- Suscripcion realtime a plan_participants con reconnect

### Chat (Chat.jsx — 144 lineas + useRealtimeChat.js — 65 lineas)
- Mensajes en tiempo real via Supabase postgres_changes INSERT
- Agrupados por fecha (Hoy/Ayer/fecha, traducido 6 idiomas)
- Avatares solo cuando cambia el usuario
- Burbuja propia (accent) vs ajena (card)
- Timestamps HH:MM
- Reconnecting banner amarillo automatico
- Max 1000 chars, Enter para enviar
- Cache de perfiles para evitar N+1

### Perfil (Profile.jsx — 231 lineas)
- Vista: avatar (o iniciales), nombre+edad, username, ciudad, bio, intereses (badges), genero
- Edicion: foto upload (JPG/PNG/WebP max 2MB), nombre (50), username (20, unique check), bio (300 con contador), birthdate, genero (5 opciones), ciudad (CityInput autocomplete), intereses (multi-select), idioma (6 opciones con banderas)
- Onboarding: barra de progreso 3 segmentos (nombre, birthdate, intereses) + hint text
- Toast "Profile saved" al guardar
- Confirm() antes de sign out
- Labels semanticos: `<label htmlFor>` en todos los campos

### Perfil Publico (PublicProfile.jsx — 77 lineas)
- Read-only: avatar, nombre+edad, username, ciudad, bio, intereses, "Member since"
- Back button

### Reset Password (ResetPasswordScreen.jsx — 72 lineas)
- Formulario: nueva password (min 8) + repetir + show/hide toggle
- Validacion: longitud + match
- `db.auth.updateUser({ password })` con recovery token
- Exito → sign out → redirect a landing

---

## 8. INTERNACIONALIZACION

- **6 idiomas:** es, en, pt, fr, de, it
- **103 keys** en translations.js (24KB, limpio sin keys muertas)
- **Categorias** con labels en 6 idiomas
- **Fechas** formateadas con `Intl.DateTimeFormat` y locales nativos
- **Persistencia:** localStorage (`q_lang`) + campo `lang` en perfil de Supabase
- **Landing** con traducciones propias (objeto LT interno, no en translations.js)

---

## 9. TEMAS

**Dark:** Accent #CDFF6C (lima), BG #0A0A0A, Card #141414, Text #F0EBE1, Muted #999/#888
**Light:** Accent #4A8800 (verde), BG #F5F4F1, Card #FFFFFF, Text #1A1A1A, Muted #595959 (WCAG AA 4.5:1)

- Toggle en header, persistido en localStorage (`q_theme`)
- Deteccion automatica de preferencia del sistema
- Escala tipografica (FS): xs(12) sm(14) md(16) lg(20) xl(24) xxl(32)
- Grid de espaciado (SP): 4/8/12/16/20/24/32/40px

---

## 10. ACCESIBILIDAD

- Landmarks semanticos: `<header>`, `<main id="main-content">`, `<nav>`
- Skip link "Skip to content" visible con Tab (traducido 6 idiomas)
- Focus ring via `:focus-visible` (outline 2px, solo teclado)
- `aria-live="polite"` en toast, `aria-live="assertive"` en loading
- `aria-label` en BottomNav botones, FilterBar dropdown, lang picker
- `<label htmlFor>` en formularios (Create, Profile)
- Focus trap en modales (ClockPicker)
- Touch targets minimo 44px (BottomNav, FilterBar, Profile lang)
- Safe area insets (bottom + left + right) para notch/home indicator
- `role="listbox"` + `aria-expanded` en FilterBar categoria
- Text overflow con ellipsis en textos largos (PlanCard, PlanDetail)
- Responsive `@media (max-width: 380px)` para pantallas pequenas

---

## 11. RENDIMIENTO

- **Code splitting:** translations.js en chunk separado
- **Lazy loading:** Todas las paginas con `React.lazy` + `Suspense`
- **Google Maps:** Carga on-demand via singleton promise (loadGoogleMaps)
- **Debounce:** PlaceSearch/CityInput 300ms
- **Single query:** fetchPlans usa embedding de Supabase (plans + profiles + participant count en 1 round-trip)
- **Distancia:** Delta de longitud ajustado por latitud (`cos(lat)`)
- **Cache:** Perfiles cacheados en useRealtimeChat (useRef)
- **Service Worker:** Cache assets estaticos, network-first para API/HTML/JS

---

## 12. TESTING (27 tests e2e)

| Suite | Tests | Que cubre |
|-------|-------|-----------|
| Landing | 5 | Render, errores JS, perf <5s, responsive 320px, CTA |
| Auth | 4 | Registro, login valido/invalido, sin auth redirige |
| Create | 3 | Navegacion BottomNav, validacion disabled, titulo+categoria |
| Feed | 4 | Carga, cards/empty, filtro categoria, bottom nav |
| Plan Detail | 4 | Click card, organizador+participantes, chat tab, URL invalida |
| Profile | 4 | Info, edit mode, persistencia nombre, 6 idiomas |
| Errors | 3 | 404, plan inexistente, offline recovery |

**Helpers:** `loginViaSDK` (login + auto-onboarding via SDK), `waitForAppReady`
**Fixture:** Plan de test creado en beforeAll, borrado en afterAll

---

## 13. MIDDLEWARE (middleware.js — 76 lineas)

Intercepta `/plan/:id` en Vercel Edge para inyectar meta tags OG dinamicos:
1. Valida formato del plan ID (regex 6-12 chars)
2. Fetch plan desde Supabase REST API (anon key)
3. Genera HTML con og:title, og:description, og:image, twitter:card
4. Redirect con cookie anti-loop, cache 5min
5. Escape HTML en todos los valores interpolados (XSS prevention)

---

## 14. VARIABLES DE ENTORNO

| Variable | Uso | Donde |
|----------|-----|-------|
| VITE_SUPABASE_URL | URL del proyecto Supabase | Frontend |
| VITE_SUPABASE_KEY | Anon key (client-side) | Frontend |
| VITE_GOOGLE_MAPS_KEY | Google Maps API | Frontend |
| VITE_SENTRY_DSN | Sentry error tracking | Frontend (prod) |
| SUPABASE_URL | Para scripts | Scripts |
| SUPABASE_ANON_KEY | Para scripts | Scripts |
| SUPABASE_SERVICE_ROLE_KEY | Admin DB access | Scripts |
| TEST_EMAIL | Cuenta test e2e | Tests |
| TEST_PASSWORD | Password test e2e | Tests |

---

## 15. DEPENDENCIAS

**Produccion:** react 18.2, react-dom 18.2, react-router-dom 7.13, @supabase/supabase-js 2.39, @sentry/react 10.46
**Dev:** vite 5.0, @vitejs/plugin-react 4.2, @playwright/test 1.58, dotenv 17.3, canvas 3.2

---

## 16. ESTADISTICAS

| Metrica | Valor |
|---------|-------|
| Archivos fuente | 31 en src/ |
| Lineas de codigo | ~4,200 |
| Paginas | 8 |
| Componentes | 11 |
| Hooks | 3 |
| Tablas DB | 4 |
| Tests e2e | 27 |
| Idiomas | 6 |
| Categorias | 16 |
| Keys i18n | 103 × 6 = 618 |
