# Prompts para Claude Code — queda

Guía paso a paso para construir queda con Claude Code.

**Instrucciones de uso:**
1. Abre Claude Code en tu proyecto (`queda-app/`).
2. Asegúrate de que el archivo `queda-brief.md` está en la raíz del proyecto.
3. Usa los prompts en el orden indicado. No saltes pasos.
4. Después de cada prompt, prueba la funcionalidad antes de pasar al siguiente.
5. Haz un commit de git después de cada capa que funcione.

---

## PROMPT 0 — Onboarding inicial

Úsalo una sola vez, al empezar la primera sesión con Claude Code.

```
Lee el archivo queda-brief.md en la raíz del proyecto. Es el diseño completo
del producto que vamos a construir juntos. Contiene la tesis, el usuario
primario, el sistema de tokens, la estructura técnica, y las decisiones
clave tomadas.

Después de leerlo, dime:

1. Un resumen de 5 líneas de qué es queda, para confirmarme que lo has
   entendido.
2. Qué archivos del proyecto actual vas a conservar y qué archivos vas a
   tocar en el primer paso.
3. Qué dudas concretas tienes antes de empezar a construir.

No escribas ningún código todavía. Solo léeme y confírmame que estamos
alineados.
```

---

## PROMPT 1 — Routing base y layout

Cuando el Prompt 0 esté resuelto y tengas alineación.

```
Vamos a montar el esqueleto de navegación de la app. Quiero:

1. Instalar react-router-dom v7 (ya está en package.json).
2. Crear la estructura de carpetas:
   src/
     pages/
     components/
     hooks/
3. Crear las siguientes rutas iniciales (pantallas placeholder por ahora,
   solo <h1> con el nombre):
   - / (Feed — landing si no hay auth, feed de planes si hay auth)
   - /login
   - /signup
   - /verify (OTP)
   - /profile
   - /create-plan
   - /plan/:id
   - /my-plans
4. Crear un componente <Layout /> con:
   - Header superior con logo "queda" + saldo de tokens visible (placeholder
     por ahora, "6 tokens").
   - Contenido de la página en el centro.
   - Navegación inferior tipo mobile con iconos: Feed, Crear, Mis planes,
     Perfil.
5. Aplicar el Layout a todas las rutas excepto /login, /signup y /verify.
6. Usar estilos inline simples consistentes con el actual App.jsx (fondo
   #0A0A0A, texto #F0EBE1, acento #CDFF6C). No instalar Tailwind ni
   librerías de UI.

Importante: no implementes lógica real todavía. Solo estructura navegable
con placeholders. Al final, debería poder pulsar cada tab y ver la pantalla
correspondiente.
```

---

## PROMPT 2 — Auth con WhatsApp OTP

Antes de este prompt, asegúrate de que tienes cuenta en Twilio (o alternativa) y el servicio OTP de Supabase configurado, o este paso fallará.

```
Vamos a implementar el sistema de autenticación con OTP.

Contexto importante: Supabase soporta auth por teléfono (SMS OTP) nativamente
mediante Twilio o MessageBird. WhatsApp OTP se puede hacer vía Twilio Verify
o vía servicios como MessageBird / Infobip. Por ahora, implementa SMS OTP
(estándar de Supabase). Cuando tengamos claro el proveedor de WhatsApp, se
cambia el canal — la lógica de la app no cambia.

Tareas:

1. Actualizar src/lib/supabase.js si es necesario para soportar signInWithOtp
   con phone.

2. Pantalla /signup:
   - Input de número de teléfono (con prefijo internacional, default +44 UK).
   - Botón "Enviar código".
   - Al enviar, llama a supabase.auth.signInWithOtp({ phone }) y navega a
     /verify pasando el teléfono como state.

3. Pantalla /verify:
   - Input de 6 dígitos (código OTP).
   - Botón "Verificar".
   - Al verificar, llama a supabase.auth.verifyOtp({ phone, token, type: 'sms' }).
   - Si es correcto, crea el perfil del usuario en la tabla `profiles` si no
     existe (lo siguiente) y navega a /onboarding.

4. Pantalla /onboarding (nueva, añádela al router):
   - Formulario con campos: edad (número), género (male/female/non-binary/
     other/prefer_not_to_say), nombre a mostrar.
   - Al enviar, actualiza profiles con esos datos y pone token_balance a 6
     (lo implementaremos bien en el Prompt 4).
   - Luego navega a /.

5. Proteger rutas: crear un hook useAuth() que devuelva el usuario actual y
   un componente <ProtectedRoute /> que redirija a /login si no hay sesión.

6. Pantalla /login:
   - Variante de /signup para usuarios existentes (mismo flujo de OTP, pero
     si el usuario ya existe, va directo al feed después de verificar).

Usa las RLS policies ya configuradas en el schema. Si hay que ajustar algo
en profiles para que el usuario nuevo pueda crear su propio perfil,
hazme saber antes de modificar SQL.
```

---

## PROMPT 3 — Schema SQL extendido para tokens

Este prompt solo genera el SQL. Tú lo revisas y lo ejecutas manualmente en Supabase SQL Editor.

```
Necesito que generes las migraciones SQL necesarias para extender el schema
actual con el sistema de tokens descrito en queda-brief.md sección 10.

Tareas:

1. Crear un nuevo archivo sql/migration_v3_tokens.sql con:
   - Nueva tabla tokens_ledger con todos los campos descritos.
   - Ampliaciones a profiles (token_balance, phone_verified, phone_number,
     passport_mode_until).
   - Ampliaciones a plans (gender_filter, cancellation_deadline_hours,
     checked_out_at).
   - Ampliaciones a plan_participants (attended, thumbs_up, deposit_resolved).
   - RLS policies para tokens_ledger (usuario solo ve sus propios movimientos).
   - Función add_tokens(user_id, amount, reason, related_plan_id) que inserta
     en ledger y actualiza token_balance, respetando el techo de 21.
   - Función deduct_tokens similar.
   - Función process_plan_checkout(plan_id) que procesa check-out entero.
   - Función process_weekly_regen() para cron.
   - Función cancel_plan(plan_id, user_id) con lógica de 24h.
   - Índices necesarios para performance.

2. No ejecutes el SQL. Solo genéralo en el archivo.

3. Al final, dame:
   - Un resumen de lo que hace el script.
   - Instrucciones claras para que yo lo ejecute en Supabase SQL Editor.
   - Las verificaciones que debería hacer después (ejemplo: "ejecutar SELECT
     contra X tabla y confirmar que devuelve Y").
   - Qué podría salir mal y cómo revertirlo.

Importante: el script debe ser idempotente donde sea posible (IF NOT EXISTS,
DROP POLICY IF EXISTS, etc.) para que pueda ejecutarlo dos veces sin romper
nada.
```

---

## PROMPT 4 — Sistema de tokens (lógica cliente)

Ejecutar después de que el SQL del Prompt 3 esté aplicado en Supabase.

```
Ahora implementa la lógica de tokens en el frontend.

Tareas:

1. Crear src/lib/tokens.js con funciones:
   - getTokenBalance(userId) — consulta el saldo actual.
   - getTokenHistory(userId, limit) — últimos movimientos del ledger.
   - subscribeToBalance(userId, callback) — realtime de Supabase para
     actualizar el saldo cuando cambie.

2. Crear hook useTokens() que expone:
   - balance (número, reactivo)
   - history (array)
   - loading, error

3. Actualizar el Layout para que el saldo del header use useTokens() y
   se actualice en tiempo real.

4. Crear componente <TokenHistory /> en src/components/ que muestra los
   movimientos del usuario (cantidad, razón legible en español, fecha).

5. Añadir pantalla /wallet (añadir ruta) que muestra:
   - Saldo actual grande y centrado.
   - Explicación breve de cómo se ganan y pierden tokens (desplegable tipo FAQ).
   - Historial de movimientos completo.
   - Indicador visual si está en regeneración (saldo 0 o 1).

6. En el perfil del usuario, añadir link a /wallet.

No toques todavía la lógica de depositar tokens al crear planes o al apuntarse
— eso viene en los siguientes prompts. Por ahora solo visualización y
suscripción al saldo.
```

---

## PROMPT 5 — Crear plan + Feed básico

```
Implementa el flujo de crear un plan y mostrarlos en el feed.

Parte 1: Crear plan (/create-plan)

Formulario con los campos:
- Título (text, máx 100 chars)
- Descripción (textarea, opcional, máx 500 chars)
- Categoría (select con opciones: deporte, copas, comida, cultura, otros —
  si se te ocurren mejores, propón)
- Lugar (input con autocomplete de Google Places — usa src/lib/googleMaps.js
  ya configurado)
- Fecha (date picker, mínimo hoy)
- Hora (time picker)
- Capacidad (número, min 2, max 20)
- Modo de unión: Abierto / Con aprobación / Privado
- Filtro de género: Solo hombres / Solo mujeres / Mixto
- Plazo de cancelación: por defecto 24h, editable

Al enviar el formulario:
- Validar que el usuario tiene al menos 2 tokens de saldo.
- Llamar a una función transaccional que:
  a) Crea el plan en la tabla plans.
  b) Deducecta 2 tokens del usuario (depósito) mediante deduct_tokens().
  c) Registra en el ledger un movimiento de tipo "create_plan_pending" con
     +1 token pendiente. (Importante: este +1 NO se suma al token_balance
     hasta que el plan se ejecute. Define la convención — por ejemplo, un
     campo "pending" en el ledger que no se cuenta en el balance.)

Si falla cualquier paso, revertir todo (usar función Postgres para atomicidad).

Parte 2: Feed de planes (/)

Mostrar lista de planes activos:
- Ordenados por fecha/hora ascendente (próximos primero).
- Filtros aplicables (UI en la parte superior):
  - Categoría
  - Distancia (radio desde ubicación actual — usar navigator.geolocation)
  - Género del plan (debe coincidir con el del usuario o ser mixto)
  - Franja de edad del organizador (slider o preset)
- Cada tarjeta muestra: título, categoría, fecha/hora, lugar (nombre), número
  de asistentes confirmados / capacidad, nombre del organizador.
- Click en tarjeta navega a /plan/:id.

Parte 3: Detalle del plan (/plan/:id)

Muestra toda la info del plan + botón "Apuntarme" (sin funcionalidad todavía,
solo visible — lo hacemos en el Prompt 6).

Si el usuario es el organizador, ve botones para cancelar y editar (esos
también quedan pendientes).

Pruebas antes de pasar al Prompt 6:
- Crear un plan → verifica que el saldo baja de 6 a 4.
- Ver el plan en el feed.
- Abrir su detalle.
- Verificar que en /wallet aparece el movimiento de -2.
```

---

## PROMPT 6 — Apuntarse a planes + aprobación

```
Implementa el flujo de apuntarse a planes.

Parte 1: Apuntarse

En /plan/:id, si el usuario NO es el organizador:

- Si modo del plan es "Abierto":
  - Botón "Apuntarme" grande.
  - Al pulsar: valida que tiene 2+ tokens, bloquea 2 tokens, inserta en
    plan_participants con status='joined'. Todo transaccional.
  - Mostrar feedback visual y actualizar UI.

- Si modo es "Con aprobación":
  - Botón "Pedir apuntarme" (lenguaje distinto).
  - Al pulsar: bloquea 2 tokens, inserta en plan_participants con
    status='pending'.
  - Mostrar estado "Pendiente de aprobación" hasta que cambie.

- Si modo es "Privado":
  - Solo accesible por link directo, no aparece en feed. La URL ya lleva el
    plan_id; quien la tenga puede apuntarse como si fuera abierto.

- Si el usuario YA está apuntado: mostrar botón "Cancelar mi asistencia"
  en vez del de apuntarse.

Parte 2: Gestión del organizador

En /plan/:id, si el usuario ES el organizador:

- Lista de asistentes confirmados (joined) con foto, nombre, edad.
- Si hay pendientes (pending): lista aparte con botones "Aceptar" y
  "Rechazar" para cada uno.
- Aceptar: cambia status a 'joined'. No mueve tokens (ya están bloqueados
  desde que pidió apuntarse).
- Rechazar: cambia status a 'rejected' y devuelve los 2 tokens al asistente.

Parte 3: Cancelación

Botón "Cancelar mi asistencia" (asistente) en /plan/:id:
- Si faltan más de 24h (o el plazo configurado): devuelve los 2 tokens.
- Si faltan menos: pierde los 2 tokens.
- Actualizar UI.

Botón "Cancelar plan" (organizador):
- Si faltan más de plazo_cancelación: todos los asistentes recuperan sus 2
  tokens. El organizador recupera sus 2 del depósito. El +1 pendiente se
  evapora.
- Si faltan menos: todos los asistentes recuperan sus 2 tokens. El
  organizador pierde sus 2.
- En ambos casos, plan pasa a status='cancelled'.

Todas las operaciones de tokens deben ir a tokens_ledger con la razón
correcta. Todas las operaciones que muevan tokens deben ser transaccionales
(funciones Postgres que llamamos desde cliente).

Pruebas:
- Apuntarse con 2 usuarios distintos.
- Probar los 3 modos (abierto, con aprobación, privado).
- Probar cancelaciones dentro y fuera de plazo.
- Verificar en /wallet que todos los movimientos cuadran.
```

---

## PROMPT 7 — Check-out y pulgares

```
Implementa la funcionalidad de check-out del organizador.

Parte 1: Pantalla de check-out

Cuando un plan tiene fecha/hora pasada Y el organizador lo abre, mostrar
interfaz de check-out en lugar del detalle normal:

- Lista de cada asistente confirmado con:
  - Su nombre y foto.
  - Checkbox "Asistió" (por defecto marcado).
  - Checkbox "Pulgar arriba" (por defecto marcado, solo visible si
    "Asistió" está marcado).

- Botón "Finalizar plan" al pie.

Al pulsar "Finalizar plan":

Llamar a la función Postgres process_plan_checkout(plan_id) que hace
atómicamente:

1. Por cada asistente marcado "Asistió":
   - Devuelve 1 token (la mitad del depósito).
   - Si tiene pulgar arriba: suma 1 token extra.
   - Si no: no suma extra (neto -1 para el asistente).
   - Actualiza plan_participants con attended=true y thumbs_up=true/false.

2. Por cada asistente marcado "No asistió":
   - No devuelve tokens (pierde los 2).
   - Actualiza plan_participants con attended=false.

3. Al organizador:
   - Si al menos 1 asistente fue: materializa el +1 token pendiente. Devuelve
     los 2 del depósito. Balance neto del acto de crear: +1 token.
   - Si nadie fue: solo devuelve el depósito. Balance neto: 0.
   - Contar pulgares arriba recibidos:
     - ≥1 pulgar: +1 token extra.
     - ≥50% de asistentes: +2 tokens extra (reemplaza, no suma con +1).
     - 100%: +3 tokens extra (reemplaza).

4. Marcar plan con checked_out_at = now() y status='past'.

Parte 2: Si el organizador no hace check-out

Añadir un cron (o llamada periódica) que 48h después de la fecha del plan
sin check-out marque el plan como status='expired' y penalice al organizador:
- El organizador pierde 2 tokens (no apareció a su propio plan).
- Todos los asistentes recuperan los 2 del depósito completo.
- El +1 pendiente se evapora.

Esto se puede hacer en principio con un cron de Supabase diario.

Pruebas:
- Crear plan con fecha pasada (manipula directamente la DB para testear).
- Hacer check-out con mix de asistentes y no asistentes, pulgares on/off.
- Verificar en /wallet de todos los participantes que los movimientos son
  correctos.
- Probar escenario de plan sin check-out (simular paso del tiempo).
```

---

## PROMPT 8 — Invitar amigos + regeneración semanal

```
Tareas:

Parte 1: Invitar amigos

- En /profile añadir sección "Invitar amigos".
- Generar link único del tipo https://queda.xyz/invite/:code donde :code
  es un identificador derivado del user_id (usar src/lib/ids.js para generar
  códigos únicos cortos).
- Botón "Copiar link" y "Compartir por WhatsApp" (wa.me/?text=...).
- Nueva tabla invitations (code, inviter_user_id, invitee_user_id NULL,
  created_at, used_at NULL) para trackear invitaciones.
- Cuando alguien se registra usando un link de invitación:
  - Después de verificar OTP y completar onboarding, registrar la invitación
    como used_at = now() y añadir invitee_user_id.
  - Sumar 2 tokens al inviter mediante add_tokens() con razón 'invite_friend'.
- Pantalla /invite/:code que captura el código y lo guarda en localStorage
  antes de redirigir a /signup.

Parte 2: Regeneración semanal

Cron job que corre cada domingo (o lunes) a las 00:00 UTC:

- Ejecuta process_weekly_regen() que:
  - Para cada usuario con token_balance = 0: suma 1 token (razón
    'weekly_regen').
  - Para cada usuario con token_balance = 1: suma 1 token.
  - Para saldos ≥2: no hace nada.

Configurar el cron en Supabase (la infraestructura ya existe, el migration_v2
tiene un ejemplo comentado al final).

Pruebas:
- Generar link de invitación, abrir en incógnito, registrar otro usuario,
  verificar que el inviter recibe +2.
- Simular usuario con 0 y 1 tokens, ejecutar manualmente
  process_weekly_regen(), verificar.
```

---

## PROMPT 9 — Notificaciones push (PWA)

```
Implementa notificaciones básicas usando el service worker que ya existe
en public/sw.js.

Eventos que deben generar notificación:

1. Asistente: "Alguien se ha apuntado a tu plan" (para el organizador).
2. Asistente: "Tu request para X ha sido aceptado / rechazado" (para el
   asistente, cuando el organizador aprueba/rechaza).
3. Asistente: "Tu plan es mañana" (24h antes).
4. Organizador: "Tu plan es mañana, no olvides hacer check-out después" (24h
   antes).
5. Organizador: "Faltan 2h para cerrar el plan, haz check-out" (2h después
   del plan si no ha hecho check-out).
6. Cualquiera: "El plan X ha sido cancelado" (si el organizador cancela).

Implementación:

- Pedir permisos de notificación en el onboarding o primera vez que crean
  un plan.
- Guardar el push subscription endpoint en la tabla profiles (añadir columna
  push_subscription JSONB).
- Usar Edge Functions de Supabase para disparar las notificaciones en los
  eventos correspondientes (triggers en DB donde aplique, cron jobs para los
  temporales tipo "24h antes").
- El service worker actual (public/sw.js) debe extenderse para manejar
  push events y mostrar notificaciones con el API estándar
  self.registration.showNotification.

Incluye handling de errores si el permiso no está concedido (degradar a
notificaciones in-app sin romper el flujo).

Pruebas:
- Apuntarse a un plan con otro usuario → el organizador recibe push.
- Aceptar un pending → el asistente recibe push.
- Cancelar un plan → todos reciben push.
```

---

## PROMPT 10 — Pulido y lanzamiento interno

Este prompt es el último antes de empezar beta cerrada.

```
Último paso antes de considerar MVP listo.

Tareas:

1. Revisar todos los textos de la app y asegurar consistencia de idioma
   (español para España como default, posible switch a inglés UK como
   siguiente idioma).

2. Añadir una pantalla /onboarding-welcome la primera vez que un usuario
   entra a la app tras el signup:
   - 3 slides explicando qué es queda (basado en la misión del brief).
   - Slide final explicando el sistema de tokens en 3 líneas simples.
   - Botón "Entendido, vamos allá".

3. Añadir en /wallet un FAQ básico con las reglas del sistema de tokens
   explicadas en lenguaje llano (no técnico).

4. Revisar todos los estados vacíos:
   - Feed sin planes: mensaje amigable invitando a crear el primero.
   - Mis planes sin nada: igual.
   - Historial de tokens vacío: igual.

5. Añadir error boundaries específicos en las pantallas principales para
   que un error en una pantalla no tire toda la app.

6. Revisar el CSP en vercel.json y confirmar que no hay dominios bloqueados
   que la app necesita.

7. Probar en móvil real (no solo DevTools). El flujo completo de
   registro → crear plan → otro usuario se apunta → check-out debe
   funcionar sin glitches.

8. Generar un checklist de "pre-lanzamiento" con todas las cosas que hay
   que verificar manualmente antes de abrir a usuarios reales.

No añadas funcionalidad nueva que no esté en el brief. Si se te ocurre
algo, apúntalo en una nota aparte para v2 — no lo construyas.
```

---

## Notas generales para usar con Claude Code

### Regla de oro
Después de cada prompt, **prueba que funciona** antes de pasar al siguiente.
Si algo no va, no saltes adelante. Claude Code puede arreglar lo anterior
con un mensaje tipo "X no funciona, hace Y en vez de Z, arréglalo".

### Commits
Haz un commit de git después de cada capa que funcione. Mensajes tipo:
- "feat: routing + layout base"
- "feat: auth con OTP"
- "feat: sistema de tokens"
- "feat: crear planes"
- "feat: apuntarse a planes"
- "feat: check-out"
- etc.

Así si algo se rompe, vuelves a un estado funcional.

### Si Claude Code se pierde
Recordatorio útil para reenfocar: "Recuerda que estamos construyendo queda
según queda-brief.md. La decisión X no tiene sentido porque contradice la
tesis Y del brief. Revisa la sección Z y ajusta".

### Si te quedas atascado
No intentes resolver el problema con más prompts iterativos. Para, copia
el error o el comportamiento raro, y pégamelo en una nueva conversación
conmigo (no con Claude Code) diciendo "Claude Code está haciendo X, yo
quería Y, ayúdame a entender qué pasa". Yo puedo auditar desde fuera sin
gastar contexto del proyecto.

### Qué NO hacer
- No pidas a Claude Code que implemente funcionalidades de "Ideas v2"
  (modo passport, canje, DNI verify). Son distracciones.
- No pidas que añada tests exhaustivos al principio — es prematuro con un
  producto sin usuarios. Tests básicos sí (happy path), tests de cada edge
  case no.
- No pidas features de monetización. El brief lo deja claro: no hay dinero
  real en MVP.

### Estimación de tiempo
Cada prompt típicamente es 1 sesión de 1-3h con Claude Code (incluyendo
pruebas). Total estimado: 2-4 semanas de trabajo a ritmo tranquilo, más el
tiempo de revisión manual y testing.

---

Fin del documento de prompts.
