# Code Review — queda-app

**Fecha:** 2026-04-12
**Archivos revisados:** 35 (todo src/, sql/, scripts/, middleware, config)

---

## 1. SEGURIDAD

### SEC-01 — Service role key hardcodeada en script
- **Archivo:** `scripts/simulate.mjs:9-11`
- **Severidad:** CRITICA
- **Problema:** La service_role key de Supabase esta en texto plano en el archivo. Esta key bypasea todo el RLS y da acceso total a la base de datos. Si el repo es publico (o lo sera), cualquier persona puede leer/escribir/borrar toda la DB.
- **Solucion:**
```js
// simulate.mjs
import 'dotenv/config'
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // nunca en codigo
)
```
Y rota la key actual desde el dashboard de Supabase inmediatamente.

---

### SEC-02 — No hay validacion de capacidad en JOIN (race condition)
- **Archivo:** `src/lib/supabase.js:131-135` + `sql/migration_v2.sql:107-109`
- **Severidad:** CRITICA
- **Problema:** La RLS policy de `plan_participants` INSERT solo verifica `auth.uid() = user_id`. No verifica que el plan no este lleno. Dos usuarios haciendo JOIN simultaneamente pueden exceder la capacidad porque la verificacion de `spotsLeft` es solo en el frontend (`PlanDetail.jsx:59`). El boton se desactiva con `isFull` pero la DB no lo impone.
- **Solucion:** Crear un trigger o cambiar el INSERT por una funcion RPC con SECURITY DEFINER:
```sql
CREATE OR REPLACE FUNCTION join_plan(p_plan_id TEXT, p_user_id UUID, p_status TEXT DEFAULT 'joined')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capacity INT;
  v_joined INT;
BEGIN
  SELECT capacity INTO v_capacity FROM plans WHERE id = p_plan_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found or inactive'; END IF;

  SELECT COUNT(*) INTO v_joined FROM plan_participants
    WHERE plan_id = p_plan_id AND status = 'joined';

  IF p_status = 'joined' AND v_joined >= v_capacity THEN
    RAISE EXCEPTION 'Plan is full';
  END IF;

  INSERT INTO plan_participants (plan_id, user_id, status)
    VALUES (p_plan_id, p_user_id, p_status)
    ON CONFLICT (plan_id, user_id) DO NOTHING;
END;
$$;
```

---

### SEC-03 — Profiles SELECT policy demasiado abierta
- **Archivo:** `sql/migration_v2.sql:36`
- **Severidad:** MEDIA
- **Problema:** `USING (true)` permite leer TODOS los perfiles a CUALQUIERA, incluyendo usuarios no autenticados (la anon key basta). Un scraper podria extraer emails, ubicaciones, fechas de nacimiento de todos los usuarios.
- **Solucion:**
```sql
-- Cambiar a solo autenticados
CREATE POLICY "Authenticated can read profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
```
Y eliminar el campo `email` del SELECT en `fetchPublicProfile` (ya lo haces, pero la policy aun lo permite).

---

### SEC-04 — XSS potencial en InfoWindow de MapFeed
- **Archivo:** `src/pages/MapFeed.jsx:107-117`
- **Severidad:** MEDIA
- **Problema:** Se construye HTML con template literals e interpolacion directa de `plan.title`, `plan.place_name`, y `orgName`. Si un usuario crea un plan con titulo `<img src=x onerror=alert(1)>`, se inyecta HTML en el InfoWindow de Google Maps.
- **Solucion:**
```js
const esc = s => s?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') || ''

const content = `
  <div style="...">
    <div style="...">${esc(emoji)} ${esc(plan.title)}</div>
    ...
  </div>
`
```

---

### SEC-05 — No hay sanitizacion del contenido de mensajes
- **Archivo:** `src/components/Chat.jsx:96` + `src/hooks/useRealtimeChat.js:38`
- **Severidad:** BAJA
- **Problema:** El contenido de mensajes se renderiza con `{msg.content}` en JSX, lo cual es seguro contra XSS (React escapa automaticamente). Sin embargo, no hay validacion server-side de longitud — la DB acepta TEXT sin limite, solo el frontend limita a 1000 chars. Un usuario puede enviar mensajes enormes via API directamente.
- **Solucion:** Anadir CHECK constraint en SQL:
```sql
ALTER TABLE messages ADD CONSTRAINT messages_content_length CHECK (char_length(content) <= 2000);
```

---

### SEC-06 — Upload de avatar sin validacion de tipo/tamano
- **Archivo:** `src/lib/supabase.js:39-46`
- **Severidad:** MEDIA
- **Problema:** Solo se lee la extension del nombre del archivo (`file.name.split('.').pop()`), pero no se valida el MIME type real ni el tamano. Un usuario podria subir un archivo .exe renombrado a .jpg, o un archivo de 100MB.
- **Solucion:**
```js
export const uploadAvatar = async (uid, file) => {
  const MAX_SIZE = 2 * 1024 * 1024 // 2MB
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED.includes(file.type)) { showErr('Only JPG, PNG, WebP allowed'); return }
  if (file.size > MAX_SIZE) { showErr('Max 2MB'); return }
  // ... rest
}
```
Tambien configurar las Storage Policies en Supabase para restringir MIME type y tamano.

---

### SEC-07 — Middleware OG: plan ID no validado en query SQL
- **Archivo:** `middleware.js:21`
- **Severidad:** BAJA
- **Problema:** El `code` viene del URL y se interpola en la query REST: `?id=eq.${code}`. Aunque Supabase REST API parametriza automaticamente, un plan ID malicioso con caracteres especiales podria causar comportamiento inesperado. El `esc()` solo se aplica al HTML output, no al query.
- **Solucion:**
```js
const code = url.pathname.split('/plan/')[1]?.split('/')[0]?.split('?')[0]
if (!code || !/^[A-Z0-9]{6,10}$/i.test(code)) return // validar formato
```

---

### SEC-08 — OAuth redirect_to no esta restringido
- **Archivo:** `src/lib/auth.js:19`
- **Severidad:** BAJA
- **Problema:** `redirectTo: window.location.origin + '/auth/callback'` depende de `window.location.origin`. Si la app se sirve desde un dominio inesperado (ej. preview deploys), el redirect podria filtrar tokens a URLs no controladas. Supabase permite configurar redirect URLs permitidas en el dashboard — asegurarse de que esten restringidas.

---

## 2. RENDIMIENTO

### PERF-01 — N+1 queries en fetchPlans
- **Archivo:** `src/lib/supabase.js:66-103`
- **Severidad:** MEDIA
- **Problema:** `fetchPlans` hace 3 queries secuenciales: plans, participant counts, y profiles. Para el feed principal, esto significa 3 round-trips al servidor en cada carga o cambio de filtro. Ademas, el conteo de participantes descarga TODOS los registros de plan_participants para los planes mostrados y cuenta en JS, en vez de contar en SQL.
- **Solucion:** Crear una vista o funcion RPC que devuelva todo en una query:
```sql
CREATE OR REPLACE FUNCTION get_feed_plans(
  p_category TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT NULL,
  p_lat FLOAT DEFAULT NULL,
  p_lng FLOAT DEFAULT NULL,
  p_radius_km FLOAT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(...) AS $$
  SELECT p.*, 
    (SELECT COUNT(*) FROM plan_participants pp WHERE pp.plan_id = p.id AND pp.status = 'joined') as participant_count,
    row_to_json(pr.*) as organizer
  FROM plans p
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE p.status = 'active' AND p.date >= p_date_from
  ...
$$;
```

---

### PERF-02 — Filtro de distancia impreciso
- **Archivo:** `src/lib/supabase.js:79-82`
- **Severidad:** BAJA
- **Problema:** El calculo `delta = radiusKm / 111` es una aproximacion rectangular que falla en latitudes altas (un grado de longitud se acorta). Esto devuelve planes fuera del radio real. Despues no se hace un segundo filtrado con haversine. En el feed se muestra la distancia real, pero planes fuera del radio aparecen igualmente.
- **Solucion:** Ajustar el delta de longitud con el coseno de la latitud, o filtrar en el frontend con haversine despues:
```js
const latDelta = radiusKm / 111
const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))
```

---

### PERF-03 — Google Maps se re-inicializa en cada render de PlaceSearch
- **Archivo:** `src/components/PlaceSearch.jsx:23-56`
- **Severidad:** MEDIA
- **Problema:** Cada vez que se monta PlaceSearch, se crea un nuevo `google.maps.Map`. Si el usuario navega entre paginas (ej. feed -> create -> feed -> create), se crean multiples instancias del mapa sin limpiar las anteriores. Esto consume memoria y GPU. El efecto tiene un timeout pero no limpia el mapa en el return.
- **Solucion:** Limpiar en el cleanup del useEffect, o reutilizar la instancia:
```js
useEffect(() => {
  // ... create map
  return () => {
    if (mapObj.current) {
      google.maps.event.clearInstanceListeners(mapObj.current)
      mapObj.current = null
    }
  }
}, [])
```

---

### PERF-04 — loadGM polling con setInterval
- **Archivo:** `src/components/PlaceSearch.jsx:3-10`, `src/components/CityInput.jsx:3-15`, `src/pages/MapFeed.jsx:9-16`
- **Severidad:** BAJA
- **Problema:** La funcion `loadGM` y `getPlacesLib` estan duplicadas en 4 archivos y usan polling cada 100ms para detectar cuando Google Maps esta listo. Esto es ineficiente y puede correr hasta 10 segundos si falla.
- **Solucion:** Mover a un unico modulo con Promise-based loading:
```js
// src/lib/googleMaps.js
let _promise = null
export const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve()
  if (_promise) return _promise
  window.__loadGoogleMaps?.()
  _promise = new Promise((resolve, reject) => {
    const orig = window.__gmReady
    window.__gmReady = () => { orig?.(); resolve() }
    setTimeout(() => reject(new Error('Google Maps timeout')), 15000)
  })
  return _promise
}
```

---

### PERF-05 — Re-renders innecesarios en App.jsx por inline objects
- **Archivo:** `src/App.jsx:154-159`
- **Severidad:** BAJA
- **Problema:** Cada Route element recibe inline arrow functions (`onPlanClick={id => navigate('/plan/' + id)}`) y inline objects, lo que causa que los componentes lazy-loaded reciban nuevas props en cada render del padre, rompiendo cualquier optimizacion con `React.memo`. Con un componente como Feed que usa `useCallback`, el `onPlanClick` cambia en cada render igualmente.
- **Solucion:** Memoizar callbacks:
```js
const handlePlanClick = useCallback(id => navigate('/plan/' + id), [navigate])
```

---

### PERF-06 — Chat sin paginacion ni virtualizacion
- **Archivo:** `src/hooks/useRealtimeChat.js:13` + `src/components/Chat.jsx:51`
- **Severidad:** MEDIA
- **Problema:** Solo se cargan los ultimos 50 mensajes (`limit=50`). No hay opcion de "cargar mas" ni scroll infinito. Si un plan tiene 200 mensajes, los primeros 150 no son accesibles. Ademas, 50 mensajes se renderizan todos en el DOM sin virtualizacion — con mensajes largos y avatares, esto puede ser lento en moviles.

---

### PERF-07 — MapFeed crea markers sin clustering
- **Archivo:** `src/pages/MapFeed.jsx:84-134`
- **Severidad:** BAJA
- **Problema:** Se crean hasta 50 markers individuales. Si hay muchos planes en la misma zona, los markers se superponen y el mapa se vuelve ilegible. Ademas, usar `google.maps.Marker` (deprecated) en vez de `google.maps.marker.AdvancedMarkerElement`.

---

## 3. ARQUITECTURA

### ARCH-01 — App.jsx es un God Component (172 lineas de logica pura)
- **Archivo:** `src/App.jsx`
- **Severidad:** MEDIA
- **Problema:** App.jsx maneja: auth state, profile loading, theme, language, toast, offline detection, routing, onboarding, OAuth callback. Todo el estado global esta en un unico componente con 12 hooks useState. Cualquier cambio de lang/theme/toast re-renderiza TODA la app.
- **Solucion:** Extraer a contextos separados:
  - `AuthContext` — authUser, profile, onboarding
  - `ThemeContext` — theme, lang, toast
  - O usar un state manager ligero como Zustand

---

### ARCH-02 — Prop drilling masivo
- **Archivo:** Todo `src/`
- **Severidad:** MEDIA
- **Problema:** `c` (colores), `lang`, `authUser`, y `profile` se pasan como props a TODOS los componentes, a traves de 3+ niveles de jerarquia. Esto genera firmas de componente enormes y acopla todo al estado de App.jsx.
- **Solucion:** React Context:
```jsx
const AppContext = createContext()
// En App: <AppContext.Provider value={{ c, lang, authUser, profile }}>
// En hijos: const { c, lang } = useContext(AppContext)
```

---

### ARCH-03 — loadGM duplicada en 4 archivos
- **Archivo:** `PlaceSearch.jsx:3-10`, `MapModal.jsx:3-12`, `MapFeed.jsx:9-16`, `CityInput.jsx:3-15`
- **Severidad:** MEDIA
- **Problema:** La misma funcion de carga de Google Maps esta copy-pasted en 4 componentes con ligeras variaciones. Si se necesita cambiar el polling interval o el timeout, hay que hacerlo en 4 sitios.
- **Solucion:** Extraer a `src/lib/googleMaps.js` (ver PERF-04).

---

### ARCH-04 — MapModal opera fuera de React (DOM manipulation directa)
- **Archivo:** `src/components/MapModal.jsx`
- **Severidad:** MEDIA
- **Problema:** Este componente crea y manipula nodos DOM manualmente (createElement, appendChild, etc.) en un overlay fijo. Esto bypasea el ciclo de vida de React, no se beneficia del virtual DOM, y tiene colores hardcodeados (ej. `#141414`, `#CDFF6C`, `#F0EBE1`) que ignoran el tema actual. Si el usuario esta en light mode, el modal aparece en dark mode.
- **Solucion:** Reescribir como Portal de React con los colores del tema pasados como props/contexto. O al minimo, leer el tema actual al crear los elementos.

---

### ARCH-05 — Traducciones duplicadas entre Landing.jsx y translations.js
- **Archivo:** `src/pages/Landing.jsx:5-102`
- **Severidad:** BAJA
- **Problema:** Landing.jsx tiene su propio objeto COPY con traducciones hardcodeadas, separado del sistema central de traducciones (T en translations.js). Cualquier cambio de copy requiere editar ambos.
- **Solucion:** Mover las traducciones del landing a translations.js.

---

### ARCH-06 — Gender labels duplicadas
- **Archivo:** `src/pages/Profile.jsx:12-19`
- **Severidad:** BAJA
- **Problema:** GENDER_LABELS es un objeto de traducciones inline que deberia estar en translations.js.

---

## 4. ERRORES Y EDGE CASES

### ERR-01 — Race condition en auth callback
- **Archivo:** `src/App.jsx:57-61`
- **Severidad:** MEDIA
- **Problema:** Si el usuario llega a `/auth/callback` con un code, se ejecuta `exchangeCodeForSession` y luego `navigate('/')`. Pero tambien se ejecuta `getSession()` en paralelo y `onAuthStateChange` escucha eventos. Esto puede causar multiples cargas de perfil simultaneas y estados inconsistentes. El `setTimeout` de 3s en linea 63 es un workaround fragil.
- **Solucion:** Si estamos en `/auth/callback`, esperar a que el exchange termine antes de ejecutar getSession:
```js
if (window.location.pathname === '/auth/callback') {
  const params = new URLSearchParams(window.location.search)
  if (params.get('code')) {
    try { await db.auth.exchangeCodeForSession(params.get('code')) } catch {}
    navigate('/', { replace: true })
    return // let onAuthStateChange handle the rest
  }
}
```

---

### ERR-02 — useEffect con dependencia `[]` pero usa `navigate`
- **Archivo:** `src/App.jsx:56,90`
- **Severidad:** BAJA
- **Problema:** El useEffect del auth tiene `[]` como dependencias pero usa `navigate` dentro. Si `navigate` cambiara (raro con React Router 7 pero posible), el effect no se re-ejecutaria. React avisa sobre esto con eslint-plugin-react-hooks.

---

### ERR-03 — Suscripcion realtime sin manejo de errores
- **Archivo:** `src/pages/PlanDetail.jsx:30-37` + `src/hooks/useRealtimeChat.js:22-43`
- **Severidad:** MEDIA
- **Problema:** Las suscripciones realtime no manejan errores de conexion. Si la conexion WebSocket se pierde y reconecta, los mensajes intermedios se pierden sin que el usuario lo sepa. No hay indicador de "reconectando" ni logica de refetch al reconectar.
- **Solucion:**
```js
const channel = db.channel('chat-' + planId)
  .on('postgres_changes', { ... }, callback)
  .on('system', {}, payload => {
    if (payload.extension === 'postgres_changes' && payload.status === 'error') {
      // Refetch messages on reconnect
      fetchMessages(planId).then(msgs => setMessages(msgs))
    }
  })
  .subscribe((status) => {
    if (status === 'CHANNEL_ERROR') { /* retry logic */ }
  })
```

---

### ERR-04 — genId puede colisionar
- **Archivo:** `src/lib/utils.js:2`
- **Severidad:** BAJA
- **Problema:** `genId()` genera un ID de 8 caracteres alfanumericos (36^8 = ~2.8 trillion combinaciones). Con Math.random (no criptografico) y solo 8 chars, la probabilidad de colision crece con el numero de planes. Ademas, no hay constraint UNIQUE con retry en el frontend — si colisiona, el INSERT falla silenciosamente (el catch muestra un error generico).
- **Solucion:** Usar `crypto.getRandomValues` y aumentar a 10-12 chars, o usar UUID y acortar con base62.

---

### ERR-05 — Plan no marca status como 'full' cuando se llena
- **Archivo:** `src/lib/supabase.js:131-135`
- **Severidad:** MEDIA
- **Problema:** Cuando alguien se une y el plan llega a capacidad maxima, el campo `status` en la tabla `plans` no se actualiza a 'full'. El feed filtra por `status = 'active'`, asi que planes llenos siguen apareciendo. La UI muestra "Full" correctamente, pero el filtro de la DB no lo sabe.
- **Solucion:** Actualizar status en el trigger o en la funcion RPC de join:
```sql
-- Dentro de join_plan:
IF v_joined + 1 >= v_capacity THEN
  UPDATE plans SET status = 'full' WHERE id = p_plan_id;
END IF;
```

---

### ERR-06 — Planes pasados nunca se marcan como 'past'
- **Archivo:** `sql/migration_v2.sql`
- **Severidad:** MEDIA
- **Problema:** No hay ningun cron job ni trigger que cambie `status` a 'past' cuando la fecha del plan ya paso. El feed filtra `date >= today`, pero planes viejos quedan en estado 'active' indefinidamente.
- **Solucion:** Cron job diario en Supabase:
```sql
-- pg_cron
SELECT cron.schedule('mark-past-plans', '0 1 * * *',
  $$UPDATE plans SET status = 'past' WHERE date < CURRENT_DATE AND status IN ('active', 'full')$$
);
```

---

### ERR-07 — Organizador puede unirse a su propio plan como participante
- **Archivo:** `src/pages/Create.jsx:49`
- **Severidad:** BAJA
- **Problema:** Despues de crear un plan, el organizador se auto-une con `joinPlan(plan.id, authUser.id)`. Esto es correcto para contar capacidad. Pero en PlanDetail, si el organizador hace click en "Leave plan", puede dejar su propio plan como participante pero seguir siendo organizador. No hay validacion que impida al organizador dejar su plan.
- **Solucion:** En la UI, no mostrar "Leave plan" al organizador (ya se hace con `!isOrganizer` check en linea 250). Pero proteger tambien en la DB con un CHECK o policy.

---

### ERR-08 — window.location.reload() despues de register
- **Archivo:** `src/pages/AuthScreen.jsx:64`
- **Severidad:** BAJA
- **Problema:** `setTimeout(()=>window.location.reload(),100)` es un hack para forzar recarga despues del registro. Esto pierde todo el estado de React y fuerza una recarga completa. Deberia dejarse que `onAuthStateChange` maneje el cambio de estado.

---

## 5. BUENAS PRACTICAS

### BP-01 — Variable `c` shadowed en multiples contextos
- **Archivo:** `src/pages/Profile.jsx:108`, `src/pages/PublicProfile.jsx:63`, `src/components/FilterBar.jsx:43`, `src/pages/Create.jsx:130`
- **Severidad:** MEDIA
- **Problema:** La variable `c` se usa para el tema de colores (prop) pero tambien como variable de iteracion en `.find(c => c.slug === slug)`. Esto shadowa la prop y puede causar bugs sutiles:
```js
// Profile.jsx:108 — `c` aqui es el item de CATEGORIES, NO el tema de colores
const cat = CATEGORIES.find(c => c.slug === slug)
// Si alguien usa c.A aqui, obtiene undefined en vez del color accent
```
- **Solucion:** Renombrar la prop del tema a `colors` o `theme`, o renombrar el parametro del find:
```js
const cat = CATEGORIES.find(cat => cat.slug === slug)
```

---

### BP-02 — Inline styles masivos sin sistema CSS
- **Archivo:** Todo el proyecto
- **Severidad:** BAJA
- **Problema:** Toda la app usa inline styles con objetos JS. Esto impide: pseudo-classes (:hover nativo), media queries, animaciones complejas, y hace el JSX dificil de leer. Algunos componentes tienen lineas de 500+ caracteres de estilos.
- **Solucion:** No es critico para una app de este tamano, pero considerar CSS Modules o una libreria CSS-in-JS si la app crece. Al minimo, extraer estilos comunes a constantes.

---

### BP-03 — No hay TypeScript ni PropTypes
- **Archivo:** Todo el proyecto
- **Severidad:** BAJA
- **Problema:** Sin tipos, es facil pasar props incorrectas. Ej: `c` (colores) vs `c` (categoria), `plan.profiles` (singular pero es un objeto), `selected` (array en CalendarPicker pero string en CategoryPicker). Los errores se descubren solo en runtime.
- **Solucion:** Considerar JSDoc types al minimo:
```js
/** @param {{ c: ThemeColors, lang: string }} props */
```

---

### BP-04 — Hardcoded strings en lugar de constantes
- **Archivo:** Multiples
- **Severidad:** BAJA
- **Problema:** Status values ('active', 'full', 'cancelled', 'past', 'joined', 'pending', 'rejected', 'open', 'closed') estan hardcodeados como strings en multiples archivos. Un typo causa un bug silencioso.
- **Solucion:**
```js
export const PLAN_STATUS = { ACTIVE: 'active', FULL: 'full', CANCELLED: 'cancelled', PAST: 'past' }
export const JOIN_STATUS = { JOINED: 'joined', PENDING: 'pending', REJECTED: 'rejected' }
```

---

### BP-05 — PlanCard "spots left" no esta traducido
- **Archivo:** `src/components/PlanCard.jsx:43`
- **Severidad:** BAJA
- **Problema:** `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` y `'Full'` estan hardcodeados en ingles, no usan el sistema de traducciones. La app soporta 6 idiomas pero estos textos siempre salen en ingles.
- **Solucion:** Pasar `lang` como prop y usar T[lang].

---

### BP-06 — Chat i18n incompleto
- **Archivo:** `src/components/Chat.jsx:34-36,54-55`
- **Severidad:** BAJA
- **Problema:** Solo soporta espanol e ingles para "Hoy/Today", "Ayer/Yesterday", "No messages yet", "Type a message". Los otros 4 idiomas caen a ingles.
- **Solucion:** Usar T[lang] del sistema de traducciones.

---

### BP-07 — Falta de accesibilidad en FilterBar dropdowns
- **Archivo:** `src/components/FilterBar.jsx:36-59`
- **Severidad:** BAJA
- **Problema:** El dropdown de categorias es un `<div>` custom sin roles ARIA. No es navegable con teclado, no anuncia nada a screen readers, no se cierra con Escape. Los `<select>` nativos para fecha y distancia son accesibles, pero el de categoria no.
- **Solucion:** Anadir `role="listbox"`, `aria-expanded`, `aria-activedescendant`, y handler para Escape/Arrow keys. O usar un `<select>` nativo como los otros filtros.

---

### BP-08 — console.log en simulate.mjs (esperado) pero catch vacios en produccion
- **Archivo:** Multiples archivos
- **Severidad:** BAJA
- **Problema:** Hay muchos `catch {}` y `catch () {}` vacios que tragan errores silenciosamente. Esto dificulta el debugging. Ejemplos:
  - `App.jsx:68` — `try { prof = await ... } catch {}`
  - `supabase.js:22` — `catch { return null }`
  - `PlaceSearch.jsx:97` — `catch { setResults([]); setOpen(false) }`
- **Solucion:** Al minimo loggear a Sentry:
```js
catch (e) { Sentry.captureException(e); return null }
```

---

## Resumen por Severidad

| Severidad | Count | IDs |
|-----------|-------|-----|
| CRITICA   | 2     | SEC-01, SEC-02 |
| MEDIA     | 12    | SEC-03, SEC-04, SEC-06, PERF-01, PERF-03, PERF-06, ARCH-01, ARCH-02, ARCH-03, ARCH-04, ERR-01, ERR-03, ERR-05, ERR-06, BP-01 |
| BAJA      | 13    | SEC-05, SEC-07, SEC-08, PERF-02, PERF-04, PERF-05, PERF-07, ARCH-05, ARCH-06, ERR-02, ERR-04, ERR-07, ERR-08, BP-02 a BP-08 |

## Prioridades Recomendadas

1. **INMEDIATO:** Rotar service_role key y sacarla del codigo (SEC-01)
2. **INMEDIATO:** Implementar validacion de capacidad server-side (SEC-02)
3. **CORTO PLAZO:** Sanitizar HTML en InfoWindows (SEC-04), validar uploads (SEC-06)
4. **CORTO PLAZO:** Cron para marcar planes pasados (ERR-06), status 'full' automatico (ERR-05)
5. **MEDIO PLAZO:** Optimizar queries del feed (PERF-01), extraer loadGM (ARCH-03), Context API (ARCH-02)
