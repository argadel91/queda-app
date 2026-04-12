# UX/Design Audit — queda-app

**Fecha:** 2026-04-12
**Pantallas revisadas:** Landing, AuthScreen, Feed, MapFeed, Create, PlanDetail, Profile, PublicProfile, ResetPasswordScreen + todos los componentes

---

## 1. VISUAL

### VIS-01 — Contraste insuficiente en muted text (light mode)
- **Pantalla:** Todas
- **Severidad:** ALTA
- **Problema:** `M: '#666'` y `M2: '#666'` sobre `BG: '#F5F4F1'` dan ratio ~3.8:1. WCAG AA requiere 4.5:1 para texto normal. Afecta fechas, descripciones secundarias, placeholders, y labels en todas las pantallas.
- **Mejora:** Cambiar light theme `M` a `'#555'` y `M2` a `'#5A5A5A'` para alcanzar 4.5:1+.

### VIS-02 — Tamanios de fuente sin escala definida
- **Pantalla:** Todas
- **Severidad:** MEDIA
- **Problema:** Se usan 12+ tamanios distintos (10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 32, 44px) sin una escala tipografica clara. Esto crea ruido visual y dificulta la jerarquia.
- **Mejora:** Limitar a una escala de 7 tamanios: 11px (caption), 13px (small), 14px (body), 16px (lead), 20px (h3), 26px (h2), 40px (h1).

### VIS-03 — Espaciado sin grid base consistente
- **Pantalla:** Create, Profile, Landing, PlanDetail
- **Severidad:** MEDIA
- **Problema:** Se mezclan valores como 10, 12, 14, 18, 20px que no siguen un grid de 4 u 8px. Ejemplo: Create usa `marginBottom: '18px'` entre secciones, Landing usa `marginTop: '10px'`, ClockPicker usa `marginBottom: '20px'`.
- **Mejora:** Estandarizar a grid de 4px: 4, 8, 12, 16, 20, 24, 32, 40, 48px.

### VIS-04 — Color accent sobreutilizado
- **Pantalla:** Todas
- **Severidad:** BAJA
- **Problema:** El accent (#CDFF6C / #4A8800) se usa para: botones primarios, links, badges, borders activos, tabs, usernames, tags de interes, contadores de spots. Pierde impacto visual al estar en todas partes.
- **Mejora:** Reservar accent para acciones primarias y estados activos. Usar colores secundarios para badges y metadata.

### VIS-05 — Estilos de boton inconsistentes
- **Pantalla:** Landing, Auth, Create, PlanDetail, Profile
- **Severidad:** MEDIA
- **Problema:** Padding de botones varia: `'13px 20px'` (Btn), `'14px'` (auth submit), `'16px 44px'` (landing CTA), `'10px 18px'` (MapModal), `'6px 12px'` (approve/reject). Border-radius varia entre 8, 10, 12, 14px.
- **Mejora:** Definir 3 tamanios de boton: sm (8px 14px, radius 8), md (12px 20px, radius 10), lg (16px 32px, radius 12).

---

## 2. LAYOUT

### LAY-01 — Safe area no manejada en contenido con scroll
- **Pantalla:** Feed, PlanDetail, PublicProfile, Create
- **Severidad:** ALTA
- **Problema:** `paddingBottom` es hardcoded (80px, 100px) sin sumar `env(safe-area-inset-bottom)`. En iPhones con notch, el contenido inferior queda tapado por el BottomNav + home indicator.
- **Mejora:** Usar `paddingBottom: 'calc(80px + env(safe-area-inset-bottom))'`.

### LAY-02 — BottomNav con safe area parcial
- **Pantalla:** BottomNav
- **Severidad:** MEDIA
- **Problema:** Solo aplica `env(safe-area-inset-bottom)` en padding vertical, pero no en horizontal. En landscape con notch lateral, los botones laterales quedan bajo el notch.
- **Mejora:** Anadir `paddingLeft: 'env(safe-area-inset-left)'`, `paddingRight: 'env(safe-area-inset-right)'`.

### LAY-03 — Text overflow no manejado en PlanCard y PlanDetail
- **Pantalla:** PlanCard, PlanDetail
- **Severidad:** MEDIA
- **Problema:** `plan.place_name` en PlanCard (linea 31) no tiene ellipsis — nombres largos rompen el layout en 1 linea. En PlanDetail, `plan.place_name` (linea 166) tampoco tiene overflow handling.
- **Mejora:** Anadir `overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'` a textos largos.

### LAY-04 — CalendarPicker grid muy ajustado
- **Pantalla:** Create (CalendarPicker)
- **Severidad:** BAJA
- **Problema:** `gap: '3px'` entre dias del calendario es muy pequeno para touch. Los numeros de dia son de 13px en celdas de ~40px — funcional pero ajustado en pantallas pequenas.
- **Mejora:** Aumentar gap a 4px, padding de celdas a 8px.

### LAY-05 — No hay responsive especifico para <380px
- **Pantalla:** Todas
- **Severidad:** BAJA
- **Problema:** Los `maxWidth: '420px'` / `'500px'` funcionan bien en movil estandar, pero en pantallas de 320px (iPhone SE) algunos elementos quedan apretados (FilterBar, CategoryPicker, botones de share).
- **Mejora:** Considerar media query para reducir padding y font-size en <380px.

---

## 3. INTERACCION

### INT-01 — Touch targets por debajo de 44px
- **Pantalla:** BottomNav, FilterBar, ClockPicker, Auth lang picker, Chat send
- **Severidad:** ALTA
- **Problema:**
  - BottomNav: botones con `padding: '6px 12px'` + icono 20px = ~32px altura
  - FilterBar: select dropdowns con `padding: '6px 10px'` = ~28px altura
  - Auth lang picker: `padding: '6px 10px'` = ~28px
  - Chat send: 40x40px (borderline)
  - ClockPicker: numeros del reloj en areas de 24-28px
- **Mejora:** Asegurar `minHeight: '44px', minWidth: '44px'` en todos los elementos interactivos. Para el reloj, aumentar el radio del circulo.

### INT-02 — No hay loading skeletons
- **Pantalla:** Feed, PlanDetail, PublicProfile, Chat
- **Severidad:** MEDIA
- **Problema:** Todas las pantallas muestran un spinner generico durante la carga. No hay skeleton loaders que anticipen el layout del contenido. Esto aumenta el perceived loading time.
- **Mejora:** Implementar skeletons que imiten la forma de PlanCards (feed), info card (plan detail), avatar+nombre (profile).

### INT-03 — Acciones destructivas sin confirmacion
- **Pantalla:** PlanDetail (Leave plan), Profile (Sign out)
- **Severidad:** MEDIA
- **Problema:** "Leave plan" y "Sign out" se ejecutan inmediatamente sin dialogo de confirmacion. Un tap accidental puede sacar al usuario de un plan o cerrar sesion.
- **Mejora:** Mostrar dialogo de confirmacion: "Are you sure you want to leave this plan?"

### INT-04 — Feedback insuficiente al guardar perfil
- **Pantalla:** Profile
- **Severidad:** MEDIA
- **Problema:** Al guardar el perfil, el boton muestra `'...'` y luego vuelve al modo vista sin ningun feedback de exito. El usuario no sabe si se guardo correctamente.
- **Mejora:** Mostrar toast de exito "Profile saved" o check animado.

### INT-05 — Contador de caracteres falta en Create description
- **Pantalla:** Create
- **Severidad:** BAJA
- **Problema:** El textarea de descripcion tiene `maxLength={500}` pero no muestra contador (Profile bio SI lo tiene: `{bio.length}/300`). El usuario no sabe cuanto espacio le queda.
- **Mejora:** Anadir `<div>{description.length}/500</div>` debajo del textarea.

### INT-06 — Texto de loading generico
- **Pantalla:** Create, PlanDetail, Profile, Auth
- **Severidad:** BAJA
- **Problema:** Todos los botones de accion muestran `'...'` durante carga. No hay indicacion de QUE esta pasando (creando, guardando, uniendose...).
- **Mejora:** Usar textos especificos: "Creating...", "Saving...", "Joining...".

---

## 4. FLUJO

### FLU-01 — Onboarding sin progreso visible
- **Pantalla:** Profile (onboarding mode)
- **Severidad:** MEDIA
- **Problema:** El onboarding muestra el formulario completo de perfil sin indicar que campos son obligatorios (excepto * en el label) ni cuantos pasos faltan. El usuario puede sentirse abrumado por la cantidad de campos.
- **Mejora:** Marcar visualmente los 3 campos obligatorios (bio, birthdate, interests) con un indicador de progreso: "Complete 3 fields to get started".

### FLU-02 — Crear plan requiere demasiados scrolls
- **Pantalla:** Create
- **Severidad:** MEDIA
- **Problema:** El formulario de creacion es una pagina larga con 7 secciones (titulo, categoria, fecha, hora, lugar, capacidad, modo, descripcion). En movil hay que hacer mucho scroll. No hay indicador de progreso ni wizard por pasos.
- **Mejora:** Considerar un wizard con pasos o al minimo un stepper visual arriba que indique las secciones. Alternativamente, colapsar secciones completadas.

### FLU-03 — Feed vacio sin call-to-action claro
- **Pantalla:** Feed
- **Severidad:** MEDIA
- **Problema:** Cuando no hay planes, muestra emoji de telescopio + texto "No plans found. Be the first to create one!" pero no hay boton para crear plan. El usuario tiene que descubrir el boton ➕ en el BottomNav.
- **Mejora:** Anadir boton "Create a plan" debajo del mensaje de empty state.

### FLU-04 — Share screen tras crear plan no cierra el flujo
- **Pantalla:** Create (success screen)
- **Severidad:** BAJA
- **Problema:** Tras crear un plan, se muestra la pantalla de exito con botones de share (WhatsApp, Telegram, Copy). Si el usuario copia el link, no hay feedback visual de que se copio. Si hace click en "View plan", funciona. Pero "Home" es un boton sin estilo que parece un link.
- **Mejora:** Mostrar toast "Link copied!" al copiar. Estilizar "Home" como boton secundario.

### FLU-05 — MapFeed sin indicacion de como interactuar
- **Pantalla:** MapFeed
- **Severidad:** BAJA
- **Problema:** El mapa aparece sin instrucciones. Si no hay planes cerca, el mapa esta vacio y el usuario no sabe que puede hacer zoom, filtrar, o crear planes.
- **Mejora:** Mostrar overlay sutil "Tap a marker to see plan details" cuando hay planes, o empty state cuando no hay.

---

## 5. ACCESIBILIDAD

### ACC-01 — Sin labels semanticos en formularios
- **Pantalla:** Auth, Create, Profile, ResetPassword
- **Severidad:** ALTA
- **Problema:** El componente `Lbl` renderiza un `<div>` en vez de `<label>`. Los inputs no tienen `<label htmlFor>` asociado. Screen readers no pueden anunciar que campo es cada input.
- **Mejora:** Cambiar `Lbl` a `<label htmlFor={id}>` y anadir `id` a cada input.

### ACC-02 — Sin landmarks semanticos
- **Pantalla:** Todas
- **Severidad:** ALTA
- **Problema:** Todo es `<div>`. No hay `<main>`, `<nav>`, `<header>`, `<footer>`. Los screen readers no pueden navegar por regiones.
- **Mejora:** Envolver contenido principal en `<main>`, top bar en `<header>`, BottomNav en `<nav>`.

### ACC-03 — Sin aria-live en toast y loading
- **Pantalla:** App.jsx (toast), Feed (loading)
- **Severidad:** MEDIA
- **Problema:** Los toasts y cambios de estado de carga no se anuncian a screen readers.
- **Mejora:** Anadir `aria-live="polite"` al contenedor de toast y `aria-busy="true"` durante carga.

### ACC-04 — Focus ring ausente en inputs
- **Pantalla:** Todas con inputs
- **Severidad:** MEDIA
- **Problema:** Todos los inputs tienen `outline: 'none'` sin focus ring alternativo. Los usuarios de teclado no pueden ver que elemento tiene foco.
- **Mejora:** Anadir `boxShadow: '0 0 0 3px ${c.A}40'` en focus, o un border-color change visible.

### ACC-05 — Sin skip link al contenido
- **Pantalla:** App.jsx
- **Severidad:** BAJA
- **Problema:** Usuarios de teclado tienen que tabular por todo el top bar y BottomNav antes de llegar al contenido principal.
- **Mejora:** Anadir link oculto "Skip to content" que aparezca al tabular.

### ACC-06 — Botones de icono sin aria-label en BottomNav
- **Pantalla:** BottomNav
- **Severidad:** MEDIA
- **Problema:** Los botones del BottomNav tienen emojis como texto (🔍, 🗺️, ➕, 👤) pero no tienen `aria-label`. Screen readers leeran el emoji en vez del proposito del boton.
- **Mejora:** Anadir `aria-label={LABELS[tab.labelKey][lang]}` a cada boton.

---

## Resumen por Severidad

| Severidad | Count | IDs |
|-----------|-------|-----|
| ALTA | 7 | VIS-01, LAY-01, INT-01, ACC-01, ACC-02, FLU-03, ACC-04 |
| MEDIA | 14 | VIS-02, VIS-03, VIS-05, LAY-02, LAY-03, INT-02, INT-03, INT-04, FLU-01, FLU-02, ACC-03, ACC-06, FLU-03, INT-06 |
| BAJA | 8 | VIS-04, LAY-04, LAY-05, INT-05, INT-06, FLU-04, FLU-05, ACC-05 |

## Top 5 Prioridades

1. **Contraste de muted text en light mode** (VIS-01) — Fix rapido en theme.js, afecta toda la app
2. **Touch targets de 44px** (INT-01) — Critico para usabilidad movil, afecta BottomNav y FilterBar
3. **Safe area handling** (LAY-01) — Contenido tapado en iPhones con notch
4. **Labels semanticos** (ACC-01) — Cambiar `Lbl` a `<label>`, impacto masivo en accesibilidad
5. **Empty state con CTA** (FLU-03) — Reducir friccion cuando no hay planes en el feed
