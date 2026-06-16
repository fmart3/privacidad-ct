# Portal ARSOP — Guía de Integración para el Sitio Web de CyberTrust

---

## 1. Introducción

Este repositorio contiene un **portal web público** que permite a los clientes (titulares de datos) de CyberTrust ejercer sus **derechos ARSOP** (Acceso, Rectificación, Supresión, Oposición, Portabilidad) conforme a la **Ley 21.719 de Protección de Datos Personales de Chile**.

En resumen, es una aplicación web que:

1. **Recibe solicitudes ARSOP** de clientes a través de un formulario público.
2. **Gestiona el consentimiento** del tratamiento de datos personales del cliente (uso de datos y marketing).
3. **Verifica la identidad** del solicitante mediante un código OTP (one-time password) enviado por email.
4. **Protege todos los formularios** con Cloudflare Turnstile (CAPTCHA) para mitigar abuso automatizado.
5. **Se conecta a n8n** (plataforma de automatización) para orquestar todo el flujo de negocio, incluyendo la interacción con HubSpot CRM y envío de correos automatizados.

> **Nota:** El layout incluye actualmente un banner que indica que el sitio está en **etapa de prueba** y que los datos ingresados son de demostración. Debe retirarse antes de pasar a producción real (`app/layout.tsx`).

---

## 2. ¿Por qué existe como un proyecto separado?

Actualmente la aplicación está desplegada en **Vercel** como un sitio independiente. La idea es que se **integre al sitio principal de CyberTrust** (`cybertrust.one`) con un enlace desde el sitio principal dentro de la sección de Políticas de Privacidad.

---

## 3. Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Framework Frontend | **Next.js 15** (App Router) con **TypeScript** |
| Estilos | **CSS puro** (variables CSS, dark mode) en `app/globals.css` |
| Runtime | **React 19** (client-side rendering para las páginas interactivas) |
| Backend API | **Next.js Route Handlers** (API routes server-side, patrón BFF) |
| Anti-abuso | **Cloudflare Turnstile** (`@marsidev/react-turnstile`) en los formularios |
| Automatización | **n8n** (workflow engine, desplegado aparte) |
| CRM | **HubSpot** (gestión de contactos y propiedades) |
| Base de datos | **PostgreSQL** (historial de solicitudes ARSOP) |
| Despliegue actual | **Vercel** |

> **Arquitectura:** los Route Handlers de `app/api/` actúan como un **Backend-for-Frontend (BFF)**: validan la entrada, verifican el token de Turnstile y hacen de **proxy seguro** hacia n8n ocultando las URLs de los webhooks y el secreto compartido. La lógica de negocio y la persistencia viven en n8n, no en este repositorio.

---

## 4. Páginas y Flujos — ¿Qué hace cada una?

El portal tiene **4 páginas públicas** y **4 endpoints de API**.

### 4.1 Página Principal — Formulario ARSOP (`/`)

**Ruta**: `/`  
**Archivo**: `app/page.tsx`

Es la página de entrada. Contiene un formulario donde el cliente:

1. Ingresa su **correo electrónico**.
2. Selecciona el **tipo de derecho** que desea ejercer:
   - **Acceso** — Obtener copia de sus datos personales, contratos y solicitudes previas.
   - **Rectificación** — Modificar datos personales incorrectos (nombre, apellido, teléfono, correo).
   - **Supresión** — Solicitar eliminación de datos en el sistema de Cybertrust.
   - **Oposición** — Oponerse al tratamiento de sus datos o a los correos promocionales.
   - **Portabilidad** — Obtener copia estructurada para transferir a otro proveedor.
3. Escribe un **mensaje** detallando su solicitud (obligatorio y máximo 1000 caracteres para Rectificación, Supresión y Oposición).
4. Completa la **verificación Cloudflare Turnstile** (aparece al ingresar email + tipo de derecho).
5. Envía el formulario.

**¿Qué pasa al enviar?**

```
Usuario completa formulario + Turnstile
       │
       ▼
POST /api/enviar-arsop  (API interna del portal)
       │  · valida email, tipo de derecho y mensaje
       │  · verifica el token de Turnstile contra Cloudflare
       ▼
n8n recibe la solicitud vía webhook (Bearer token)
       │
       ├─► Si el cliente NO existe en HubSpot → n8n responde "cliente_no_existe";
       │      el portal solo lo registra en logs del servidor (sin incluir el email)
       │
       └─► Si el cliente existe → solicitud ingresada + se dispara flujo OTP/consentimiento

En ambos casos el portal responde al navegador exactamente lo mismo: {"status":"ok"}
```

> **Privacy by design:** independientemente de si el cliente existe o no, **tanto la API como la página** responden idéntico (mismo JSON, mismo código HTTP, misma pantalla de "Solicitud Recibida"). Así no se revela a un tercero — ni siquiera a uno que inspeccione la respuesta con DevTools o `curl` — si un correo está o no registrado en el sistema (evita enumeración de clientes).

Al pie de esta página también hay un **banner de gestión de consentimiento** con un link a `/cambiar-consentimiento`.

---

### 4.2 Verificación de Identidad MFA (`/portal-mfa`)

**Ruta**: `/portal-mfa?ticket=XXX`  
**Archivo**: `app/portal-mfa/page.tsx`

Después de enviar una solicitud ARSOP, el cliente recibe un **correo con un link** que lo dirige a esta página. Aquí debe ingresar un **código OTP de 6 dígitos** (un input por dígito, con soporte de pegado) que recibió en ese mismo correo para verificar su identidad.

**Flujo**:
```
Cliente hace clic en link del email
       │
       ▼
/portal-mfa?ticket=abc123
       │
       ▼
Ingresa código de 6 dígitos
       │
       ▼
POST /api/validar-otp  →  n8n valida el OTP
       │
       ├─► Código válido → "Identidad verificada, solicitud enviada al equipo de privacidad"
       ├─► Código incorrecto → "Código incorrecto, reintente"
       └─► Código expirado → "Código expirado (10 min), vuelva a iniciar"
```

> **Seguridad**: Si alguien accede a `/portal-mfa` sin el parámetro `ticket`, el middleware redirige automáticamente a `/` antes de cargar la página.

---

### 4.3 Confirmación de Consentimiento (`/consentimiento`)

**Ruta**: `/consentimiento?id=XXX&token=YYY`  
**Archivo**: `app/consentimiento/page.tsx`

Cuando un cliente necesita dar o cambiar su consentimiento, recibe un **correo con un enlace seguro** (con `id` y `token`) que apunta a esta página. Aquí lee la **Política de Privacidad** y toma **dos decisiones independientes** mediante checkboxes:

- **Uso de datos personales** (`decision_datos`) — Autoriza el tratamiento de sus datos conforme a la Ley 21.719.
- **Correos promocionales** (`decision_marketing`) — Acepta recibir comunicaciones de marketing.

> **Regla de dependencia:** el marketing solo puede aceptarse si primero se acepta el uso de datos personales. Si se desmarca el uso de datos, el marketing se desmarca y deshabilita automáticamente. El servidor rechaza la combinación `marketing=acepto` con `datos=rechazo`.

**Flujo**:
```
Cliente hace clic en el enlace del email
       │
       ▼
/consentimiento?id=abc&token=xyz
       │
       ▼
Lee la política + marca sus dos decisiones + completa Turnstile
       │
       ▼
POST /api/ejecutar-consentimiento
       │  · valida id, token, decision_datos, decision_marketing
       │  · verifica el token de Turnstile
       ▼
n8n registra las preferencias en HubSpot
       │
       ├─► OK → "¡Preferencias Actualizadas!"
       └─► Token inválido/usado (403) → "Enlace expirado" + link para solicitar uno nuevo
```

Cada decisión (`decision_datos`, `decision_marketing`) se envía como `"acepto"` o `"rechazo"`.

> **Seguridad**: Token de un solo uso. Si el link ya fue utilizado o expiró, el endpoint responde `403` y la página muestra "Enlace expirado" con opción de solicitar uno nuevo en `/cambiar-consentimiento`.

---

### 4.4 Cambiar Decisión de Consentimiento (`/cambiar-consentimiento`)

**Ruta**: `/cambiar-consentimiento`  
**Archivo**: `app/cambiar-consentimiento/page.tsx`

Página simplificada donde un cliente puede **solicitar re-evaluar su consentimiento**. Solo necesita ingresar su email y completar Turnstile.

**Flujo**:
```
Cliente ingresa su email + completa Turnstile
       │
       ▼
POST /api/solicitar-cambio-consentimiento  →  n8n busca el contacto en HubSpot
       │
       ├─► Contacto encontrado → n8n genera nuevo token y envía mail con enlace a /consentimiento
       │
       └─► Contacto NO encontrado → no se envía nada (el 404 de n8n NO se reenvía al cliente)

En ambos casos el portal responde {"status":"ok"} y la página muestra el mismo mensaje:
"Si el correo está registrado, recibirá un enlace seguro en los próximos minutos"
```

> **Respuesta uniforme (anti-enumeración):** igual que en el formulario ARSOP, no se confirma ni desmiente si un correo pertenece a un cliente. El patrón es el mismo que usan los formularios de "olvidé mi contraseña" bien diseñados.

---

## 5. Endpoints de API (Backend)

Todas las rutas API están en `app/api/`. **Ninguna conecta directamente a base de datos ni a HubSpot** — todas actúan como **proxy seguro (BFF)** hacia n8n, autenticando con un Bearer token compartido.

| Endpoint | Método | ¿Qué hace? | Turnstile | Envía a n8n |
|---|---|---|---|---|
| `/api/enviar-arsop` | POST | Recibe formulario ARSOP (email, tipo_derecho, mensaje), valida y reenvía a n8n | ✅ | `N8N_WEBHOOK_URL` |
| `/api/validar-otp` | POST | Recibe `ticket` (string, ≤128 chars, charset `[a-zA-Z0-9_-]`) + `otp` (6 dígitos), valida contra n8n | — | `N8N_OTP_VALIDATE_URL` |
| `/api/ejecutar-consentimiento` | POST | Recibe `id`, `token`, `decision_datos`, `decision_marketing`; n8n valida y escribe propiedades; si datos=acepto, hace form submission a HubSpot para registrar consentimiento y preferencia de marketing | ✅ | `N8N_CONSENT_EXECUTE_URL` |
| `/api/estado-consentimiento` | POST | Recibe `id`, `token`; lee el estado actual de preferencias desde n8n (lectura no destructiva, no consume el token) | — | `N8N_CONSENT_STATE_URL` |
| `/api/solicitar-cambio-consentimiento` | POST | Recibe `email`, pide a n8n que busque el contacto y envíe nuevo mail de consentimiento | ✅ | `N8N_CONSENT_REQUEST_URL` |

> El endpoint `validar-otp` no usa Turnstile porque ya está protegido por la posesión de un `ticket` válido emitido por n8n y por el rate limiting del middleware.

### Patrón de comunicación

```
[Browser del cliente]
        │
        ▼  (HTTPS)
[Next.js API Route]  ← Validación server-side + Turnstile + rate limiting
        │
        ▼  (HTTPS + Bearer Token)
[n8n Webhook]  ← Lógica de negocio, HubSpot, PostgreSQL, emails
        │
        ▼
[HubSpot CRM / PostgreSQL / SMTP]
```

**Importante**: El portal web **NO** accede directamente a HubSpot, PostgreSQL ni a servicios de email. Todo pasa a través de n8n como capa de orquestación.

---

## 6. Automatizaciones n8n (Backend — fuera de este repositorio)

La lógica de negocio vive en **n8n**, desplegado como servicio aparte. Los workflows son el "cerebro" del sistema y **no forman parte de este repositorio** (se gestionan y respaldan por separado):

| # | Workflow | ¿Qué hace? |
|---|---|---|
| 0 | **Flujo de consentimiento de uso de datos** | Gestiona el ciclo de vida del consentimiento: envía mails con enlace seguro, procesa las decisiones de datos/marketing, actualiza HubSpot y maneja re-solicitudes |
| 1 | **ARSOP Recepción** | Recibe solicitudes ARSOP del formulario, verifica el contacto en HubSpot, genera el OTP para verificación de identidad |
| 2 | **Agente Generador de Respuesta y Automatización** | Usa IA para generar respuestas formales a solicitudes ARSOP, consultando datos del CRM y la BD |
| 6 | **Agente MFA / Validación de Identidad** | Valida códigos OTP, maneja expiración (10 min) y reintentos |

---

## 7. Seguridad Implementada

### Cabeceras HTTP

Cabeceras estáticas (todas las rutas — `next.config.mjs`):
- `X-Frame-Options: DENY` — Previene clickjacking (no se puede meter en iframe externo)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (HSTS) — Fuerza HTTPS
- `Permissions-Policy` — Deshabilita cámara, micrófono, geolocalización

`Content-Security-Policy` (dinámica, por request — `middleware.ts`):
- Se genera un **nonce criptográfico único por request**. `script-src` usa `'nonce-…'` + `'strict-dynamic'` en lugar de `'unsafe-inline'`: cualquier script inline inyectado (XSS) que no lleve el nonce es bloqueado por el navegador.
- El nonce se propaga a Next.js mediante el header `Content-Security-Policy` de la *request* (de ahí el framework lo extrae para etiquetar sus scripts de hidratación) y queda disponible para el código propio en el header `x-nonce`.
- `challenges.cloudflare.com` (Turnstile) se mantiene en `script-src` como fallback para navegadores sin soporte CSP3 (los modernos lo ignoran al haber `'strict-dynamic'`; el script de Turnstile queda permitido porque lo inyecta dinámicamente el bundle nonceado).
- `style-src` mantiene `'unsafe-inline'` como decisión consciente: los componentes usan estilos inline de React y el riesgo de inyección CSS es muy inferior al de scripts.
- La tipografía **Inter** se sirve self-hosted vía `next/font`, por lo que la CSP no necesita dominios de Google Fonts y no se filtra la IP del visitante a terceros.

> Nota: el uso de nonce exige renderizado dinámico (cada request recibe HTML con un nonce distinto), por eso el layout fuerza `headers()`. Es el trade-off estándar de una CSP con nonce.

### Cloudflare Turnstile (CAPTCHA)
- Presente en los formularios de `/`, `/consentimiento` y `/cambiar-consentimiento`.
- Verificación centralizada en `lib/turnstile.ts` (`verifyTurnstile()`): el token del navegador se verifica **server-side** contra `https://challenges.cloudflare.com/turnstile/v0/siteverify` antes de reenviar a n8n.
- **Fail-closed en producción**: si `TURNSTILE_SECRET_KEY` no está configurada y `NODE_ENV=production`, la request se rechaza con 500 (un error de configuración no desactiva el CAPTCHA silenciosamente). Solo en desarrollo se omite la verificación, con advertencia en logs.
- Los `error-codes` de Cloudflare se registran únicamente server-side; el cliente recibe un mensaje genérico (no se le da retroalimentación útil a un atacante que intente bypassear el CAPTCHA).

### Respuestas uniformes (anti-enumeración)
- `/api/enviar-arsop` y `/api/solicitar-cambio-consentimiento` responden **exactamente igual** exista o no el correo en HubSpot — mismo cuerpo (`{"status":"ok"}`) y mismo código HTTP. La distinción queda solo en los logs del servidor (sin incluir el email).
- Esto impide usar el portal como oráculo para confirmar quiénes son clientes de CyberTrust, un insumo típico para phishing dirigido.

### Middleware Edge (`middleware.ts`)
- **Rate limiting** por IP (ventana fija de 60 s): **5 solicitudes/min** para los cuatro endpoints — `/api/enviar-arsop`, `/api/validar-otp`, `/api/ejecutar-consentimiento` y `/api/solicitar-cambio-consentimiento`.
- **CSP con nonce**: genera el nonce por request y adjunta la `Content-Security-Policy` dinámica a las respuestas de página (ver sección de cabeceras).
- **Protección de rutas**: redirige a `/` si se accede a `/portal-mfa` (sin `ticket`) o `/consentimiento` (sin `id` y `token`).
- **Validación server-side** en cada endpoint: formato de email, tipo de derecho contra lista blanca, formato OTP (`/^\d{6}$/`), formato de `ticket` (string, ≤128 caracteres, charset `[a-zA-Z0-9_-]`), decisiones contra allowlist (`acepto`/`rechazo`).

> **Limitación del enfoque actual:** el contador vive en memoria del proceso (`Map`), por lo que el límite es **por instancia** y se reinicia en cada cold start. En un despliegue serverless con múltiples instancias (como Vercel) esto no garantiza un límite global; para producción conviene un store compartido (p. ej. Redis / Upstash).

### Justificación del rate limiting

El rate limiting limita cuántas solicitudes acepta un mismo origen (IP) por ventana de tiempo. No está pensado para el usuario legítimo (que hace 1-2 envíos) sino para acotar el **abuso automatizado**. Tres amenazas concretas lo justifican:

1. **Fuerza bruta sobre el OTP** (`/api/validar-otp`) — el caso más fuerte. Un OTP de 6 dígitos tiene 1.000.000 de combinaciones. Con **5 intentos/min** y la **expiración de 10 min** del código, un atacante con el `ticket` solo alcanza ~50 intentos → probabilidad de acierto ≈ 50/1.000.000 = **0,005%**. El rate limit es lo que hace que la longitud del OTP y su expiración tengan sentido: son controles que se sostienen entre sí.
2. **Enumeración de clientes / amplificación de correo** (`/api/enviar-arsop`, `/api/solicitar-cambio-consentimiento`) — aunque la respuesta sea siempre la misma (*privacy by design*), cada request legítima dispara un correo vía n8n. Sin límite, el portal podría usarse como amplificador de spam contra un buzón.
3. **Abuso de recursos y costos** (todos) — cada request reenvía a n8n, que toca HubSpot, PostgreSQL y SMTP. Limitar protege los sistemas aguas abajo y, en serverless, el costo por invocación.

**Por qué 5/min y ventana de 60 s.** El umbral se dimensiona por riesgo, no es un número mágico: debe quedar **muy por encima del uso humano legítimo** (1-2 envíos, quizá un reintento) y **muy por debajo de lo que necesita un ataque** (la fuerza bruta del OTP se vuelve inviable). 5/min cumple ambas condiciones con cero fricción para el usuario honesto. La ventana fija de 60 s se eligió por simplicidad y porque es la unidad natural para razonar "X por minuto". El valor uniforme entre endpoints reduce complejidad sin sacrificar seguridad, ya que 5/min ya es suficientemente estricto incluso para el endpoint más crítico.

**Relación con otras capas.** El rate limit **no sustituye** a Turnstile ni a la validación de entrada: los **complementa** (defensa en profundidad). Turnstile frena bots, la validación frena entradas inválidas y el rate limit acota el volumen aunque un atacante supere las capas anteriores.

**Limitaciones conocidas** (a mitigar en producción):
- **Identidad por IP**: usuarios tras un mismo NAT/proxy comparten IP (posible falso positivo) y un atacante con muchas IPs (botnet, proxies rotativos) lo evade — por eso Turnstile es el complemento necesario contra el vector distribuido.
- **Estado en memoria por instancia**: el límite real es por instancia y se reinicia en cold starts (ver nota arriba); se resuelve con un store compartido (Redis/Upstash).
- **Algoritmo de ventana fija**: permite ráfagas en el borde de la ventana (hasta ~2× el límite entre dos minutos consecutivos); alternativas más finas son *sliding window* o *token bucket*.

**Cumplimiento de estándar.** Al exceder el límite se responde `429 Too Many Requests` con la cabecera `Retry-After: 60`, conforme a RFC 9110/6585.

> Referencias: OWASP (*Blocking Brute Force Attacks*; API Security Top 10 — *API4: Unrestricted Resource Consumption*), RFC 9110/6585 (status 429 y `Retry-After`), y el principio de defensa en profundidad (NIST).

### Tokens de un solo uso
- Los enlaces de consentimiento incluyen un `token` único generado por n8n y almacenado en HubSpot.
- Una vez utilizado o expirado, el token se invalida y el endpoint responde `403`.

---

## 8. Flujo Completo End-to-End (Resumen Visual)

```
┌──────────────────────────────────────────────────────────────────┐
│                    SITIO WEB CYBERTRUST                            │
│                                                                    │
│   El cliente navega al portal ARSOP                                │
│   (actualmente en Vercel, se debe integrar a cybertrust.one)       │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  PASO 1: FORMULARIO ARSOP (/)                                      │
│                                                                    │
│  • Email + Tipo de derecho + Mensaje + Turnstile                   │
│  • Se envía a /api/enviar-arsop → n8n                              │
│  • Siempre muestra "Solicitud Procesada" (privacy by design)       │
│                                                                    │
│  Si el cliente no tiene consentimiento, n8n dispara el flujo de    │
│  consentimiento por correo (→ PASO 3).                             │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  PASO 2: VERIFICACIÓN MFA (/portal-mfa)                            │
│                                                                    │
│  • Cliente recibe email con link + código OTP de 6 dígitos         │
│  • Ingresa el código en la página                                  │
│  • Se valida contra n8n                                            │
│  • Si es correcto → solicitud pasa al equipo de privacidad         │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  PASO 2b: GENERACIÓN DE RESPUESTA (n8n + IA)                       │
│                                                                    │
│  • Agente de IA consulta HubSpot (datos, contratos, historial)     │
│  • Genera respuesta formal según tipo de derecho                   │
│  • Envía email al cliente con la respuesta                         │
│  • Plazo legal: 15 días hábiles                                    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  PASO 3: CONSENTIMIENTO (/consentimiento)                          │
│                                                                    │
│  • Cliente recibe email con enlace seguro (id + token)             │
│  • Marca dos decisiones: uso de datos / correos promocionales      │
│  • Completa Turnstile y confirma                                   │
│  • Se registra en HubSpot                                          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  OPCIONAL: CAMBIAR CONSENTIMIENTO (/cambiar-consentimiento)        │
│                                                                    │
│  • Cliente ingresa su email + Turnstile                            │
│  • Se le envía nuevo mail de consentimiento                        │
│  • Puede cambiar su decisión en cualquier momento                  │
└──────────────────────────────────────────────────────────────────┘
```
---

## 9. Variables de Entorno Requeridas

Estas son las variables que se necesitan configurar (ver `.env`):

```env
# Host base de los webhooks de n8n (común a todos)
N8N_WEBHOOK_BASE_URL=https://n8n.ejemplo.com/webhook

# Path relativo de cada webhook (se concatena a la base — ver lib/n8n.ts)
N8N_ARSOP_SEND_URL=arsop-recepcion
N8N_OTP_VALIDATE_URL=validar-otp
N8N_CONSENT_EXECUTE_URL=ejecutar-consentimiento
N8N_CONSENT_REQUEST_URL=solicitar-cambio-consentimiento
N8N_CONSENT_STATE_URL=estado-consentimiento

# Token de autenticación compartido con n8n (enviado como "Authorization: Bearer ...")
N8N_WEBHOOK_SECRET=<token-secreto>

# HubSpot Forms Submission (para registrar consentimiento y re-suscribir marketing)
# El form submission NO lleva auth — el endpoint api.hsforms.com es público por diseño.
HUBSPOT_PORTAL_ID=<portal-id>
HUBSPOT_CONSENT_FORM_GUID=<form-guid>
HUBSPOT_MARKETING_SUBSCRIPTION_ID=2310319974

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site-key-publica>
TURNSTILE_SECRET_KEY=<secret-key-privada>
```

> `NEXT_PUBLIC_TURNSTILE_SITE_KEY` se expone al navegador (necesario para renderizar el widget); el resto son **secretos server-side** y nunca deben filtrarse al cliente.

> **Notas:**
> - Para migrar n8n de host basta cambiar `N8N_WEBHOOK_BASE_URL`; los paths no cambian.
> - En producción `TURNSTILE_SECRET_KEY` es **obligatoria**: si falta, los endpoints rechazan toda solicitud (fail-closed) en lugar de omitir el CAPTCHA.
> - `HUBSPOT_PORTAL_ID` y `HUBSPOT_CONSENT_FORM_GUID` son necesarios para el form submission de consentimiento. Sin ellos, el endpoint devuelve 502 controlado (no crash).

---

## 10. Consentimiento HubSpot: Form Submission vs. PUT directo

### Por qué se usa HubSpot Forms Submission API

La API `PUT /email/public/v1/subscriptions` de HubSpot rechaza re-suscribir una dirección que el titular desuscribió previamente (`"cannot subscribe an unsubscribed address"`). La **HubSpot Forms Submission API** (`api.hsforms.com/submissions/v3/integration/submit/...`) sí permite re-suscribir porque representa un acto explícito del propio titular.

### Flujo actualizado de "Confirmar preferencias"

```
Browser → POST /api/ejecutar-consentimiento
                │
                ▼
        Turnstile + validación de params
                │
                ▼
        POST n8n webhook (ejectuar-decision)
        { id, token, decision_datos, decision_marketing }
                │
        n8n: valida token, escribe propiedades HubSpot, invalida token
        devuelve { "status": "ok", "email": "<email verificado>" }
                │
                ├─► decision_datos = "acepto"
                │       │
                │       ▼
                │   POST api.hsforms.com (lib/hubspot.ts)
                │   fields: [email]
                │   consentToProcess: true
                │   communications: [{ value: aceptaMarketing, subscriptionTypeId }]
                │
                └─► decision_datos = "rechazo" → no se llama al form (HubSpot exige consent=true)
```

**Seguridad**: el `email` para el form submission proviene **exclusivamente de la respuesta de n8n** (servidor a servidor), nunca del cuerpo que envía el browser. Si n8n no devuelve `email`, el endpoint responde 502 en lugar de continuar.

### Pre-carga del estado actual (`/api/estado-consentimiento`)

Al abrir `/consentimiento?id=...&token=...`, el portal hace inmediatamente `POST /api/estado-consentimiento` para leer las preferencias actuales del titular desde n8n. Esto convierte el portal en un **centro de preferencias real**: el titular ve su estado actual antes de tomar una decisión. El token **no se consume** en esta lectura — solo se invalida al confirmar.

El contrato del webhook `estado-consentimiento` en n8n:
```json
// Request
{ "id": "...", "token": "..." }

// Response 200
{ "datos": "Aceptado" | "Rechazado" | null, "marketing": true | false }

// Response 403 → token inválido/expirado
```

---

## 11. Diseño Visual

El portal usa un **diseño dark mode** con la siguiente paleta (definida en `app/globals.css`):

| Variable | Color | Uso |
|---|---|---|
| `--bg-color` | `#0b1120` | Fondo principal |
| `--card-bg` | `#1e293b` | Fondo de tarjetas |
| `--primary` | `#3b82f6` | Botones y elementos primarios |
| `--accent` | `#0ea5e9` | Acentos y marca CyberTrust |
| `--text` | `#f1f5f9` | Texto principal |
| `--text-muted` | `#94a3b8` | Texto secundario |
| `--success` | `#10b981` | Estados exitosos |
| `--danger` | `#ef4444` | Errores y rechazos |

**Tipografía**: **Inter**, self-hosted vía `next/font/google` (se descarga en build y se sirve desde el propio dominio — el navegador del visitante nunca contacta servidores de Google).

> Si el sitio de CyberTrust usa un diseño diferente (light mode, otros colores), las páginas deben adaptarse visualmente para mantener consistencia de marca. Todos los estilos están centralizados en `app/globals.css`.

---

## 12. Consideraciones Legales

- **Ley 21.719**: Este sistema implementa los mecanismos requeridos por la ley chilena de protección de datos personales.
- **Plazo de respuesta**: 15 días hábiles desde la solicitud.
- **Derechos cubiertos**: Acceso, Rectificación, Supresión, Oposición, Portabilidad (ARSOP).
- **Consentimiento**: Se solicita antes de procesar cualquier solicitud. Se distinguen dos decisiones (uso de datos y marketing) y se pueden aceptar, rechazar o cambiar en cualquier momento.
- **Verificación de identidad**: OTP de 6 dígitos con expiración de 10 minutos.
- **Registro**: Toda acción queda registrada con fecha y hora (timestamp) en el sistema.

---

## 12. Preguntas Frecuentes

**¿El portal accede directamente a la base de datos o a HubSpot?**  
No. Todo pasa a través de n8n. El portal solo necesita conectarse a los webhooks de n8n.

**¿Se puede usar el formulario sin n8n?**  
No. Los API routes dependen de n8n para procesar las solicitudes. Sin n8n activo, las llamadas fallarán con error 502/503.

**¿Los workflows de n8n están en este repositorio?**  
No. n8n corre como servicio separado y sus workflows se gestionan/respaldan fuera de este repositorio.

**¿Qué pasa si el sitio de CyberTrust no usa Next.js?**  
Los API routes son simples proxies HTTP (BFF). Se pueden recrear en cualquier backend (Express, FastAPI, PHP, etc.) — lo único que hacen es validar campos, verificar Turnstile y reenviar a n8n con un Bearer token.

---

## 13. Estructura de Archivos Resumida

```
arco_cyber/
├── app/
│   ├── page.tsx                                     ← Formulario ARSOP principal
│   ├── portal-mfa/page.tsx                          ← Verificación OTP
│   ├── consentimiento/page.tsx                      ← Confirmación de consentimiento (datos + marketing)
│   ├── cambiar-consentimiento/page.tsx              ← Solicitar cambio de consentimiento
│   ├── globals.css                                  ← Estilos globales (dark mode)
│   ├── layout.tsx                                   ← Layout con next/font (Inter) + banner de prueba
│   └── api/
│       ├── enviar-arsop/route.ts                    ← Proxy: formulario → n8n
│       ├── validar-otp/route.ts                     ← Proxy: OTP → n8n
│       ├── ejecutar-consentimiento/route.ts         ← Proxy: decisiones → n8n + HubSpot form submission
│       ├── estado-consentimiento/route.ts           ← Lectura no destructiva del estado actual
│       └── solicitar-cambio-consentimiento/route.ts ← Proxy: cambio → n8n
├── lib/
│   ├── n8n.ts                                       ← Config centralizada de webhooks (base URL + paths)
│   ├── turnstile.ts                                 ← Verificación Turnstile (fail-closed en producción)
│   └── hubspot.ts                                   ← Helper HubSpot Forms Submission (sin auth, server-side)
├── public/
│   └── cybertrust-logo.svg                          ← Logo de marca
├── middleware.ts                                    ← Rate limiting + protección de rutas + CSP con nonce
├── next.config.mjs                                  ← Cabeceras de seguridad estáticas + redirects
└── .env                                             ← Variables de entorno (no versionado)
```
