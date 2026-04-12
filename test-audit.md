# Test Audit — queda-app

**Fecha:** 2026-04-12
**Framework:** Playwright (e2e) | **Config:** chromium, headless, 45s timeout, localhost:5173

---

## 1. Tests Existentes

### Suite: Landing page (sin auth) — 4 tests

| # | Test | Que cubre | Estado |
|---|------|-----------|--------|
| 1 | `renders logo and CTA without crash` | La landing renderiza el logo "queda." y al menos un boton | OK |
| 2 | `no critical console errors` | No hay errores JS criticos en consola (ignora ResizeObserver, Script error, supabaseUrl) | OK |
| 3 | `loads under 5 seconds` | Performance: la pagina carga en <5s | OK |
| 4 | `no horizontal overflow at 320px` | Responsive: no hay scroll horizontal en 320px (iPhone SE) | OK |

### Suite: Authenticated flows (requiere TEST_EMAIL/TEST_PASSWORD) — 6 tests

| # | Test | Que cubre | Estado |
|---|------|-----------|--------|
| 5 | `create plan step navigation` | Navega a /create y ve el calendario o paso de fecha | ROTO |
| 6 | `plan page loads and shows tabs` | Va a /plans, click en card, ve tabs (plan/vot/result) | ROTO |
| 7 | `vote buttons respond to clicks` | Navega a /plan/TEST01AB, busca botones de voto (si/no) | ROTO |
| 8 | `going offline shows no-connection toast` | Offline/online triggers toast | SKIPPED |
| 9 | `invalid plan URL does not show blank page` | /plan/ZZZZZZZZZZ no muestra pagina en blanco | OK |
| 10 | `edit modal opens with Escape to close` | Abre modal de edicion y la cierra con Escape | ROTO |

### Suite: Expired deadline — 1 test

| # | Test | Que cubre | Estado |
|---|------|-----------|--------|
| 11 | `expired deadline shows closed message` | Plan con deadline pasada muestra "closed" | SKIPPED |

**Total: 11 tests (4 OK, 4 ROTOS, 2 SKIPPED, 1 OK condicional)**

---

## 2. Tests Rotos por Cambios Recientes

### TEST 5 — `create plan step navigation`
- **Problema:** Busca boton con texto "create|crear|creat" en la pagina principal. Ahora la navegacion es via BottomNav con emoji "➕" y texto "Create/Crear". El selector `filter({ hasText: /create|crear|creat/i })` podria no matchear el emoji. Ademas, el fallback navega a `/create/date` que no existe (la ruta es `/create`).
- **Correccion:** Cambiar fallback a `page.goto('/create')`. Actualizar selector para buscar el BottomNav.

### TEST 6 — `plan page loads and shows tabs`
- **Problema:** Navega a `/plans` que no es una ruta valida (la ruta es `/`). Busca `[role="button"]` pero PlanCard no tiene `role="button"` (es un div con onClick). Busca tabs con texto "plan|vot|result|más|more" pero las tabs ahora son "Info" y "Chat".
- **Correccion:** Cambiar a `page.goto('/')`, usar selector de PlanCard (ej. div con cursor:pointer dentro del feed), actualizar texto de tabs.

### TEST 7 — `vote buttons respond to clicks`
- **Problema:** Navega a `/plan/TEST01AB` y busca botones de voto (si/no). El sistema de votacion fue reemplazado por join/leave en el pivot v2. Ya no existen botones de voto.
- **Correccion:** Reescribir como test de join/leave plan.

### TEST 10 — `edit modal opens with Escape to close`
- **Problema:** Navega a `/plans` (no existe), busca `[role="button"]` (no existe), busca `button[aria-label="Edit title"]` (no existe en v2 — no hay modal de edicion inline).
- **Correccion:** Reescribir o eliminar. En v2, la edicion se hace en la pagina de perfil, no en planes.

### TEST 11 — Expired deadline
- **Problema:** Crea plan con schema v1 (campos `data`, `deadline`, `stops`). El schema v2 es completamente diferente (campos planos: title, category, date, time, etc.). La query INSERT fallaria.
- **Correccion:** Reescribir con schema v2 o eliminar.

### beforeEach — Login flow
- **Problema menor:** El login via SDK (`window.__supabaseClient`) sigue funcionando porque `supabase.js` re-exporta `db` que se asigna a `window.__supabaseClient`. Sin embargo, el fallback UI busca "sign in|get started" que ahora puede ser "Empieza ahora" en espanol dependiendo del idioma del navegador.
- **Impacto:** Bajo si el SDK login funciona. Alto si falla y cae al fallback UI.

---

## 3. Cobertura Actual

### Cubierto (basico)
- Landing renderiza sin crash
- No hay errores JS criticos
- Performance de carga inicial
- Responsive basico (320px)
- URL invalida no rompe la app

### NO cubierto — Flujos Criticos

| Prioridad | Flujo | Riesgo |
|-----------|-------|--------|
| CRITICA | **Join plan (capacidad)** — La funcion RPC `join_plan` con FOR UPDATE es el fix mas importante del proyecto. No hay test de que un usuario puede unirse, de que el plan se marca como full, ni de que dos joins simultaneos no exceden capacidad. | Un bug aqui rompe la feature principal |
| CRITICA | **Crear plan completo** — El wizard de 7 pasos (titulo, categoria, fecha, hora, lugar, capacidad, modo). Solo se testea que se llega al primer paso. | Regresion en cualquier paso bloquea creacion |
| CRITICA | **Auth flow completo** — Login, registro, OAuth callback, password reset, onboarding. Solo se testea login via SDK (no UI). El refactor del auth callback (eliminar setTimeout, async/await) no tiene test. | Auth rota = nadie puede usar la app |
| ALTA | **Chat en tiempo real** — Enviar mensaje, recibir mensaje de otro usuario, reconexion tras error. 0 tests. | Feature de engagement principal |
| ALTA | **Filtros del feed** — Categoria, rango de fecha, distancia con geolocalizacion. 0 tests. | Usuarios no encuentran planes |
| ALTA | **Plan cerrado** — Solicitar unirse, organizador aprueba/rechaza, estado pending visible. 0 tests. | Modo closed completamente sin testear |
| MEDIA | **Perfil** — Editar nombre/bio/username, subir avatar (validacion MIME/size), elegir ciudad, seleccionar intereses. 0 tests. | Onboarding roto = usuario atascado |
| MEDIA | **Organizador** — Ver solicitudes pendientes, aprobar, rechazar, borrar plan. 0 tests. | Organizador sin control |
| MEDIA | **Manejo de errores** — Plan lleno (toast), red caida (toast offline), sesion expirada, plan no encontrado. Solo se testea URL invalida. | UX degradada sin feedback |
| MEDIA | **i18n** — Cambio de idioma en landing, en app, persistencia en localStorage y perfil. 0 tests. | 5 de 6 idiomas sin verificar |
| BAJA | **Dark/light mode** — Toggle, persistencia, deteccion de sistema. 0 tests. | Cosmetico |
| BAJA | **Share** — Botones WhatsApp/Telegram/Copy link. 0 tests. | Funcional pero no critico |
| BAJA | **PWA** — Service worker, manifest, instalacion. 0 tests. | Progressive enhancement |
| BAJA | **OG Middleware** — Meta tags dinamicos al compartir /plan/:id. 0 tests. | SEO/sharing |

---

## 4. Cobertura por Archivo

| Archivo | Tests | Cobertura |
|---------|-------|-----------|
| Landing.jsx | 4 tests | Buena (render, errores, perf, responsive) |
| AuthScreen.jsx | 0 directos (login via SDK en beforeEach) | Minima |
| Create.jsx | 1 test roto | Ninguna real |
| Feed.jsx | 0 | Ninguna |
| MapFeed.jsx | 0 | Ninguna |
| PlanDetail.jsx | 2 tests rotos | Ninguna real |
| Profile.jsx | 0 | Ninguna |
| PublicProfile.jsx | 0 | Ninguna |
| Chat.jsx | 0 | Ninguna |
| FilterBar.jsx | 0 | Ninguna |
| supabase/*.js | 0 | Ninguna (solo e2e indirectos) |
| middleware.js | 0 | Ninguna |
| utils.js | 0 | Ninguna |

---

## 5. Recomendaciones

### Inmediato (fix tests rotos)
1. **Eliminar tests 6, 7, 10, 11** — son de v1 y no aplican al modelo actual
2. **Arreglar test 5** — cambiar fallback a `/create`, actualizar selector de BottomNav
3. **Actualizar beforeEach** — asegurar que el fallback UI funciona con textos i18n

### Corto plazo (flujos criticos)
4. **Test de join plan** — crear plan, unirse como otro usuario, verificar conteo, intentar unirse a plan lleno
5. **Test de crear plan completo** — llenar todos los campos del wizard, verificar que el plan aparece en el feed
6. **Test de auth UI** — login con email/password via UI, verificar que se muestra el feed
7. **Test de filtros** — aplicar filtro de categoria, verificar que el feed cambia

### Medio plazo
8. **Unit tests** para `genId`, `haversine`, `fmtDate`, `fmtTime`, `durToMins` (funciones puras sin dependencias)
9. **Test de chat** — enviar mensaje, verificar que aparece (requiere 2 sesiones o mock de realtime)
10. **Test de perfil** — editar nombre, guardar, verificar que persiste

### Consideraciones tecnicas
- Los tests actuales usan `waitForTimeout` extensivamente (anti-patron). Reemplazar por `waitForSelector` o `expect().toBeVisible()`.
- No hay tests de API/unit — todo es e2e. Considerar Vitest para funciones puras.
- El login via `window.__supabaseClient` es fragil — depende de que el SDK se cargue antes del timeout de 5s.
- No hay CI configurado — los tests solo se ejecutan manualmente.

---

## 6. Resumen

| Metrica | Valor |
|---------|-------|
| Tests totales | 11 |
| Tests funcionales | 5 (4 landing + 1 URL invalida) |
| Tests rotos | 4 (todos de v1) |
| Tests skipped | 2 |
| Flujos criticos cubiertos | 0/8 |
| Flujos criticos sin test | 8/8 |
| Archivos con tests | 1/25+ |
| Estimacion de cobertura real | ~10% |
