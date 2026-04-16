# queda — Product Brief

Documento de diseño de producto tras sesión de trabajo detallada.
Fecha: Abril 2026.

---

## 1. Visión del producto

### Misión
Sacar a la gente del scroll infinito de redes sociales y meterla en la vida real.

El competidor real no es Meetup, Timeleft, Bumble BFF o Eventbrite.
El competidor es **el sofá, Netflix, Instagram, TikTok, y las apps de citas** cuando se usan para socializar.

### Tesis
Impulso, emoción, velocidad, cero fricción racional.

El momento de uso clave es: aburrimiento en casa → abrir la app → plan concreto en próximas horas o días. Si el flujo tarda más de 2 minutos, pierde contra el sofá.

### Principio rector
El usuario es responsable de sus decisiones.

El sistema establece reglas mínimas de orden espontáneo, no reglas burocráticas. Evitar diseño defensivo excesivo que añada fricción racional.

---

## 2. Usuario primario

### Perfil: "Alejandro"
- **Hombre**, 28-38 años.
- **Aislado socialmente**, pocos amigos cercanos disponibles.
- Echa de menos tener colegas reales con los que hacer cosas.
- No busca fiesta. No busca ligar. No busca networking profesional.
- Puede ser expat o local, soltero o en pareja, con trabajo o sin — esos ejes no importan.

### Comportamiento
- Los hombres adultos construyen amistad a través de actividades compartidas, no de conversaciones frente a frente. El deporte/actividad es el vehículo; la amistad es el resultado.
- Los planes sueltos en formato "buffet" son lo que los usuarios quieren probar primero; la amistad recurrente viene después si el producto funciona bien.

### Usuario primario de lanzamiento
El propio fundador es el usuario modelo. Esto es ventaja estructural (sabe qué funciona sin adivinar) y también restricción (no tiene red local extensa).

---

## 3. Formato del producto

### Formato del plan
- **Planes sueltos**, no grupos recurrentes.
- **Horizonte temporal: 24-72h** predominantemente. El usuario se apunta a cosas inminentes, no a eventos dentro de 3 semanas.
- **Deporte y actividades como vehículo principal** pero no exclusivo. Cualquier categoría de plan es válida.

### Pantalla principal
Feed de planes ordenado por proximidad temporal y geográfica.

### Filtros del feed
- Edad
- Género
- Distancia
- Categoría del plan

### No se filtra por
- **Intereses declarados del usuario**. En su lugar, el sistema infiere intereses del comportamiento (planes a los que se apunta, a los que va, a los que intenta apuntarse aunque no le acepten). Revealed preferences, no stated preferences.

---

## 4. Género y seguridad

### Decisión sobre género
Planes mixtos permitidos, pero el organizador decide al crear el plan si el plan es:
- Solo hombres
- Solo mujeres
- Mixto

Esto evita los problemas estructurales de apps mixtas de "quedar con desconocidos" (apuntes masivos de hombres a planes creados por mujeres, etc.) dando control al organizador sin imponer segregación global.

### Seguridad estructural, no por reglas
La seguridad se resuelve por formato, no por normas restrictivas:
- Planes grupales en lugares públicos por defecto.
- Foco en actividades con propósito externo (no solo "tomar algo con un desconocido").
- Aprobación manual opcional del organizador al crear el plan.

---

## 5. Mecánica de planes

### Crear un plan
- **Coste:** 2 tokens bloqueados como depósito
- **Bonus del sistema:** +1 token "regalado" (pendiente, no se materializa hasta que el plan se ejecute)
- **Coste real neto:** 1 token

### Modos de unión configurables por el organizador
- **Abierto:** cualquiera puede apuntarse sin aprobación.
- **Con aprobación:** el organizador revisa cada request y aprueba o rechaza.
- **Privado:** el organizador comparte link directo, no aparece en el feed público.

### Herramientas cualitativas de control para el organizador
- Aprobación manual (modo con aprobación).
- Filtros por historial mínimo del asistente (ej: "solo gente con X planes completados").
- Filtros por tasa de asistencia histórica.

### Plazo de cancelación
- **Por defecto: 24h**.
- **Editable por el organizador al crear el plan**.

---

## 6. Sistema de tokens (completo)

### Saldos iniciales
- **Al registrarse: 6 tokens**
- **Invitar amigo que completa registro con OTP: +2 tokens**
- **Techo máximo por usuario: 21 tokens**
- **Regeneración: +1 por semana si el saldo está en 0 o 1 tokens**. Si el saldo es 2 o mayor, no hay regeneración automática.

### Mecánica del asistente
| Acción | Cambio en saldo |
|---|---|
| Apuntarse a un plan | -2 tokens (bloqueados como depósito) |
| Cancelar +24h antes del plan | Recupera los 2 tokens (neto 0) |
| Cancelar <24h antes del plan | Pierde los 2 tokens (neto -2) |
| Va al plan + organizador le da pulgar arriba automático | Recupera 1 + recibe 1 extra = **neto 0** |
| Va al plan + organizador le quita el pulgar ("no volvería a invitar") | Recupera 1 = **neto -1** |
| No aparece al plan | Pierde los 2 tokens = **neto -2** |

### Mecánica del organizador
| Acción | Cambio en saldo |
|---|---|
| Crear plan | -2 depósito + 1 token pendiente (no materializado) = coste real 1 token |
| Plan se ejecuta con ≥1 asistente | Recupera depósito + se materializa el regalo = **neto +1** |
| Plan sin asistentes (nadie se apuntó) | Recupera depósito, regalo no se materializa = **neto 0** |
| Cancelar +24h antes | Recupera depósito, regalo no se materializa = **neto 0** |
| Cancelar <24h antes | Pierde los 2 tokens = **neto -2** (en UI: "perdiste 2 tokens") |
| No aparece al plan propio | Pierde los 2 tokens = **neto -2** (en UI: "perdiste 2 tokens") |

### Bonus por pulgares arriba de asistentes (organizador)
| Situación | Bonus |
|---|---|
| Al menos 1 asistente da pulgar arriba | +1 token |
| Al menos 50% de asistentes dan pulgar arriba | +2 tokens |
| 100% de asistentes dan pulgar arriba | +3 tokens |

Los bonus son exclusivos (no se suman): el organizador recibe el tramo más alto que haya alcanzado.

### Check-out del plan
- **Solo el organizador hace check-out** al final del plan.
- Marca quién asistió y quién no.
- Por cada asistente marcado presente, pulgar arriba **automático por defecto**.
- El organizador puede quitar el pulgar a asistentes concretos con un botón ("no volvería a invitar").
- No hay check-in del asistente. No hay review con preguntas. No hay sistema de disputas.

### Ganancias máximas por plan (organizador)
- Ejecución exitosa: +1
- Pulgares arriba unánimes: +3
- **Neto máximo por plan perfecto: +3 tokens** (coste real 1, ingresos 4)

---

## 7. Anti-abuso y confianza

### Anti-Sybil (múltiples cuentas)
**WhatsApp OTP al registrarse.** Un número de teléfono = una cuenta. Alternativa más barata y equivalente a SMS OTP.

### Moderación
Los primeros 6 meses (mientras la app es pequeña): **moderación manual por el fundador**.
Casos graves se gestionan por email: organizadores serialmente irresponsables, incidentes entre usuarios, intentos de fraude.

No se implementan sistemas automáticos de:
- Suspensión de cuentas por algoritmo
- Sistema de disputas formal
- Cuestionarios post-plan complejos

Estos se añaden cuando haya datos reales de uso y abuso.

---

## 8. Canje de tokens (Opción B — features internas)

Los tokens solo tienen valor dentro de la app. No se venden, no se compran, no se transfieren entre usuarios.

Los organizadores activos que acumulan tokens pueden canjearlos por features premium dentro de la app.

### Primera feature canjeable prevista
- **Modo passport**: permite ver y apuntarse a planes en otra ciudad donde el usuario no reside. Útil para viajes.
- Más features se añadirán con el tiempo según las necesidades detectadas.

### Lo que NUNCA se hará
- Canje de tokens por dinero real.
- Venta de tokens por dinero real (al menos hasta que el producto tenga tracción consolidada y se tome decisión consciente de monetización).
- Transferencia de tokens entre usuarios.

---

## 9. Stack técnico (ya implementado)

### Plumbing actual del repo
- **Frontend:** Vite + React 18 (SPA, no framework)
- **Backend/DB:** Supabase (Auth PKCE, Postgres, Storage, Realtime)
- **Maps:** Google Maps Places API (lazy loaded)
- **Error tracking:** Sentry (production only)
- **PWA:** service worker en `public/sw.js`, manifest en `public/manifest.json`
- **Hosting:** Vercel (CSP headers + SPA rewrite en `vercel.json`)
- **DNS:** Porkbun → queda.xyz

### Schema SQL existente
En `sql/migration_v2.sql`. Incluye:
- `profiles` (con bio, foto, birthdate, gender, interests, lat/lng, city)
- `plans` (con join_mode: open/closed, status: active/full/cancelled/past)
- `plan_participants` (con status: joined/pending/rejected)
- `messages` (chat en plan)
- Funciones: `join_plan()` (atómica anti-race-condition), `delete_plan()`
- RLS configurado en todas las tablas
- Cron job preparado para marcar planes como "past" automáticamente

**El schema actual sirve para el diseño nuevo** pero requiere ajustes para implementar el sistema de tokens (ver sección siguiente).

### Estructura de carpetas limpia
```
src/
  App.jsx          (placeholder, reemplazar con UI real)
  main.jsx         (React mount + Sentry + Google Maps loader + SW)
  lib/
    supabase.js    (Supabase client + toast helpers)
    googleMaps.js  (Places/Maps lazy loaders)
    storage.js     (localStorage wrapper)
    ids.js         (genId URL-safe, profanity-filtered)
    dates.js       (locale-aware date formatters)
public/
  sw.js, manifest.json, icon-*.svg, og.png
sql/
  migration_v2.sql
```

---

## 10. Ajustes necesarios al schema SQL

Para implementar el diseño completo, el schema actual necesita las siguientes ampliaciones:

### Nueva tabla: `tokens_ledger`
Registro de todos los movimientos de tokens por usuario. Permite auditar el saldo y reconstruir el historial.

Campos principales: `user_id`, `amount` (positivo o negativo), `reason` (enum: signup, invite_friend, create_plan_pending, create_plan_executed, join_plan_deposit, join_plan_attended, join_plan_thumbs_up, join_plan_no_show, organizer_no_show, cancel_late, thumbs_bonus_tier_1/2/3, weekly_regen, passport_redeem, etc.), `related_plan_id`, `created_at`.

### Ampliaciones a `profiles`
- `token_balance INT DEFAULT 6` — saldo actual (cached, derivable de ledger).
- `phone_verified BOOLEAN` — si completó OTP.
- `phone_number TEXT UNIQUE` — para anti-Sybil.
- `first_plan_created BOOLEAN DEFAULT FALSE` — si ya recibió el bonus del primer plan (si se decide mantener) o eliminar si se optó por "+1 por cada plan".
- `passport_mode_until TIMESTAMPTZ` — si tiene modo passport activo.

### Ampliaciones a `plans`
- `gender_filter TEXT CHECK (gender_filter IN ('male','female','mixed'))` — el filtro del organizador.
- `cancellation_deadline_hours INT DEFAULT 24` — plazo editable.
- `checked_out_at TIMESTAMPTZ` — cuándo el organizador hizo check-out.

### Ampliaciones a `plan_participants`
- `attended BOOLEAN` — marcado en check-out.
- `thumbs_up BOOLEAN DEFAULT TRUE` — por defecto True, organizador puede ponerlo a False.
- `deposit_resolved BOOLEAN DEFAULT FALSE` — si ya se procesó el depósito de tokens.

### Nuevas funciones Postgres
- `deduct_tokens(user_id, amount, reason, related_plan_id)` — atómica.
- `add_tokens(user_id, amount, reason, related_plan_id)` — atómica, respeta techo de 21.
- `process_plan_checkout(plan_id)` — procesa todos los tokens de un check-out completo.
- `process_weekly_regen()` — cron job, ejecuta regeneración semanal.
- `cancel_plan(plan_id, user_id, reason)` — maneja la lógica de cancelación según tiempo al plan.

---

## 11. Aparcado para el futuro (Ideas v2)

No implementar en MVP, revisar tras lanzamiento:

- **Modo passport.** Ver planes en otras ciudades cuando viajas. Requiere densidad en múltiples ciudades.
- **Verificación de identidad (DNI).** Subir a nivel 3 de verificación si detectamos abuso serio. Por ahora, WhatsApp OTP es suficiente.
- **Sistema de canje interno expandido.** Más features premium desbloqueables por tokens.
- **Monetización con tokens comprables.** Decisión del mes 12+ con datos reales.
- **Grupos recurrentes.** Si el producto de planes sueltos funciona, abrir la posibilidad de grupos estables estilo "crew semanal".
- **Features para consumidores puros.** Si detectamos que consumidores puros se vacían de tokens, explorar mecanismos de rescate o features específicas.
- **Lanzamiento en Dubai.** Condición: guerra de Irán estabilizada + MVP validado en otro mercado + partner local con relación formalizada.

---

## 12. Estrategia de lanzamiento (pendiente)

Esta fue la decisión donde la sesión paró. **No está resuelta y merece una sesión propia** antes de lanzar.

### Situación actual
- Fundador vive en Didsbury, Manchester.
- No tiene red local significativa en Manchester.
- Tiene 5 amigos cercanos en España.
- Tiene un conocido empresario en Dubai (paralizado por contexto geopolítico).
- Tiene un amigo cercano en Sevilla (entorno jiujitsu, red limitada a ese nicho).

### Lo que NO se debe hacer
- Lanzar en Manchester sin red local. Mata la app por falta de masa crítica.
- Apostar por Dubai ahora sin relación formalizada con el partner local.
- Apostar por Sevilla esperando un lanzamiento masivo desde un nicho de jiujitsu.

### Lo que SÍ se ha acordado
Secuencia en paralelo durante los próximos 3-6 meses:

1. **Construir el MVP técnicamente** (con Claude Code, basado en este brief).
2. **Construir comunidad local en Manchester** offline (gym, run club, clases). Objetivo primario: la vida del fundador. Objetivo secundario: primeros usuarios potenciales.
3. **Mantener abierto canal con amigo de Sevilla** para piloto pequeño cuando el MVP esté listo, sin ceder equity prematuramente.
4. **Mantener Dubai en radar** a 6-12 meses vista.
5. **Lanzamiento real con estrategia de zona pensada: mes 6-9**, no antes.

### Bucle viral
Pendiente de diseñar en próxima sesión. No se ha definido aún mecanismo explícito de viralidad más allá de "invitar amigo → +2 tokens".

---

## 13. Resumen para implementación técnica

### Qué construir ahora en el MVP

**Pantallas mínimas:**
1. **Registro + OTP** (WhatsApp verify)
2. **Perfil** (edad, género, foto opcional)
3. **Feed de planes** (filtros: edad, género, distancia, categoría; orden: proximidad temporal)
4. **Crear plan** (título, descripción, categoría, ubicación vía Google Places, fecha/hora, capacidad, modo de unión, filtro de género)
5. **Detalle del plan** (info + lista de asistentes + botón apuntarse)
6. **Mis planes** (creados y a los que estoy apuntado)
7. **Check-out del organizador** (marcar asistencia + pulgar arriba/abajo por asistente)
8. **Saldo de tokens visible** en el header siempre

**Features mínimas:**
- Auth con WhatsApp OTP
- CRUD de planes
- Sistema de apuntarse + aprobación opcional
- Gestión de tokens (deposits, returns, bonuses, regeneración semanal)
- Check-out con pulgares
- Sistema de filtros del feed
- Categorías inferidas (tracking de interacciones del usuario)
- Notificaciones push básicas (plan confirmado, plan cancelado, plan mañana)

**Lo que NO se construye en MVP:**
- Chat interno (usar el de Supabase ya configurado solo si es necesario, si no, sustituir por WhatsApp link)
- Modo passport
- Sistema de canje
- Reviews complejas
- Grupos recurrentes
- Cualquier feature de Ideas v2

---

## 14. Decisiones clave tomadas

Este apartado resume las decisiones no obvias tomadas durante la sesión, para referencia futura:

1. **El competidor es el sofá, no Meetup.** No diseñar features defensivas contra otras apps sociales.
2. **Planes sueltos, no grupos recurrentes.** Los grupos son Ideas v2 si el producto de planes funciona.
3. **Intereses inferidos, no declarados.** No pedir al usuario que diga qué le gusta.
4. **Gender filter por plan, no por usuario.** El organizador decide; el asistente solo ve planes compatibles con su género según filtro del plan.
5. **Sistema de tokens unificado (una sola unidad).** No minitokens, no doble moneda, no modo organizador separado.
6. **Techo 21 por usuario.** Evita acumulación infinita; guiño a Bitcoin.
7. **Regeneración semanal limitada a saldos 0-1.** Rescata a bloqueados sin castigar al activo.
8. **Moderación manual los primeros 6 meses.** No automatizar sanciones antes de tener datos.
9. **Canje interno (Opción B), nunca dinero real en MVP.**
10. **WhatsApp OTP como anti-Sybil suficiente para MVP.** DNI verification queda en Ideas v2.
11. **Construir comunidad antes de lanzar.** No lanzar sin red local real.

---

Fin del brief.
