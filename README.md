# Portal ARSOP — Guía de Integración para el Sitio Web de CyberTrust

---

## 1. Introducción

Este repositorio contiene un **portal web público** que permite a los clientes (titulares de datos) de CyberTrust ejercer sus **derechos ARSOP** (Acceso, Rectificación, Supresión, Oposición, Portabilidad) conforme a la **Ley 21.719 de Protección de Datos Personales de Chile**.

En resumen, es una aplicación web que:

1. **Recibe solicitudes ARSOP** de clientes a través de un formulario público.
2. **Gestiona el consentimiento** del tratamiento de datos personales del cliente.
3. **Verifica la identidad** del solicitante mediante un código OTP (one-time password) enviado por email.
4. **Se conecta a n8n** (plataforma de automatización) para orquestar todo el flujo de negocio, incluyendo la interacción con HubSpot CRM y envío de correos automatizados.

---

## 2. ¿Por qué existe como un proyecto separado?

Actualmente la aplicación está desplegada en **Vercel** como un sitio independiente. La idea es que se **integre al sitio principal de CyberTrust** (`cybertrust.one`) con un enlace desde el sitio principal dentro de la sección de Políticas de Privacidad.

---

## 3. Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Framework Frontend | **Next.js 14** (App Router) con **TypeScript** |
| Estilos | **CSS puro** (variables CSS, dark mode) |
| Runtime | **React 18** (client-side rendering para las páginas interactivas) |
| Backend API | **Next.js Route Handlers** (API routes server-side) |
| Automatización | **n8n** (workflow engine, desplegado aparte) |
| CRM | **HubSpot** (gestión de contactos y propiedades) |
| Base de datos | **PostgreSQL** (historial de solicitudes ARSOPP) |
| Despliegue actual | **Vercel** |

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
   - **Rectificación** — Modificar datos personales incorrectos (nombre, apellido, teléfono).
   - **Supresión** — Solicitar eliminación de datos en el sistema de Cybertrust.
   - **Oposición** — Oponerse al tratamiento de sus datos.
   - **Portabilidad** — Obtener copia estructurada para transferir a otro proveedor.
3. Escribe un **mensaje** detallando su solicitud (máximo 1000 caracteres).
4. Envía el formulario.

**¿Qué pasa al enviar?**

```
Usuario envía formulario
       │
       ▼
POST /api/enviar-ARSOP  (API interna del portal)
       │
       ▼
n8n recibe la solicitud vía webhook
       │
       ├─► Si el cliente NO ha dado consentimiento → responde "consentimiento_requerido"
       │       └─► Portal muestra mensaje: "Debe autorizar primero" + se envía email de consentimiento
       │
       └─► Si el cliente SÍ tiene consentimiento → solicitud ingresada al sistema
               └─► Portal muestra "Solicitud enviada exitosamente"
               └─► Se dispara flujo de verificación MFA y generación de respuesta
```

Al pie de esta página también hay un **banner de gestión de consentimiento** con un link a `/cambiar-consentimiento`.

---

### 4.2 Verificación de Identidad MFA (`/portal-mfa`)

**Ruta**: `/portal-mfa?ticket=XXX`  
**Archivo**: `app/portal-mfa/page.tsx`

Después de enviar una solicitud ARSOP, el cliente recibe un **correo con un link** que lo dirige a esta página. Aquí debe ingresar un **código OTP de 6 dígitos** que recibió en ese mismo correo para verificar su identidad.

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

**Ruta**: `/consentimiento?id=XXX&token=YYY&respuesta=acepto|rechazado|revocado`  
**Archivo**: `app/consentimiento/page.tsx`

Cuando un cliente necesita dar o cambiar su consentimiento para el tratamiento de datos, recibe un **correo con botones** (Acepto / No Acepto / Revocar). Esos botones son links que apuntan a esta página con los parámetros correspondientes.

**Flujo**:
```
Cliente hace clic en botón del email (ej: "Acepto")
       │
       ▼
/consentimiento?id=abc&token=xyz&respuesta=acepto
       │
       ▼
Ve pantalla de confirmación con info legal
       │
       ▼
Presiona "Confirmar mi decisión"
       │
       ▼
POST /api/ejecutar-consentimiento  →  n8n registra la decisión en HubSpot
       │
       ├─► Acepto → actualiza HubSpot a "Aceptado", muestra éxito
       ├─► Rechazado → actualiza HubSpot a "Rechazado", muestra link para reconsiderar
```

La página maneja 3 decisiones posibles:
- **`acepto`** — El cliente autoriza el tratamiento de datos (check verde).
- **`rechazado`** — El cliente rechaza el tratamiento (X roja).
- **`revocado`** — El cliente revoca un consentimiento previamente otorgado (advertencia naranja).

> **Seguridad**: Token de un solo uso. Si el link ya fue utilizado o expiró, se muestra "Enlace expirado" con opción de solicitar uno nuevo.

---

### 4.4 Cambiar Decisión de Consentimiento (`/cambiar-consentimiento`)

**Ruta**: `/cambiar-consentimiento`  
**Archivo**: `app/cambiar-consentimiento/page.tsx`

Página simplificada donde un cliente puede **solicitar re-evaluar su consentimiento**. Solo necesita ingresar su email.

**Flujo**:
```
Cliente ingresa su email
       │
       ▼
POST /api/solicitar-cambio-consentimiento  →  n8n busca el contacto en HubSpot
       │
       ├─► Contacto encontrado (cualquier estado) → "Le enviaremos un correo para actualizar su decisión"
       │       └─► n8n genera nuevo token y envía mail de consentimiento con botones
       │
       └─► Contacto NO encontrado → "No es cliente, visite cybertrust.one para contacto"
```

---

## 5. Endpoints de API (Backend)

Todas las rutas API están en `app/api/`. **Ninguna conecta directamente a base de datos ni a HubSpot** — todas actúan como **proxy seguro** hacia n8n.

| Endpoint | Método | ¿Qué hace? | Envía a n8n |
|---|---|---|---|
| `/api/enviar-arco` | POST | Recibe formulario ARSOP, valida campos, reenvía a n8n | ✅ Webhook de recepción |
| `/api/validar-otp` | POST | Recibe código OTP + ticket, valida contra n8n | ✅ Webhook de validación OTP |
| `/api/ejecutar-consentimiento` | POST | Recibe decisión de consentimiento (acepto/rechazado/revocado), registra en n8n | ✅ Webhook de consentimiento |
| `/api/solicitar-cambio-consentimiento` | POST | Recibe email, pide a n8n que busque el contacto y envíe nuevo mail de consentimiento | ✅ Webhook de cambio |

### Patrón de comunicación

```
[Browser del cliente]
        │
        ▼  (HTTPS)
[Next.js API Route]  ← Validación server-side + rate limiting
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

Los archivos JSON en `n8n_workflows/` son exportaciones de los workflows de n8n. Estos workflows son el "cerebro" del sistema:

| # | Workflows | ¿Qué hacen? |
|---|---|---|
| 0 | **Flujo de consentimiento de uso de datos** | Gestiona todo el ciclo de vida del consentimiento: envía mails con botones acepto/rechazo, procesa respuestas, actualiza HubSpot, maneja re-solicitudes |
| 1 | **ARSOP Recepción** | Recibe solicitudes ARSOP del formulario, verifica consentimiento del contacto en HubSpot, genera OTP para verificación de identidad |
| 2 | **Agente Generador de Respuesta y Automatización** | Usa IA para generar respuestas formales a solicitudes ARSOP (acceso, rectificación, supresión, etc.), consultando datos del CRM y BD |
| 6 | **Agente MFA / Validación de Identidad** | Valida códigos OTP, maneja expiración y reintentos |

---

## 7. Seguridad Implementada

### Cabeceras HTTP (aplicadas a todas las rutas)
- `X-Frame-Options: DENY` — Previene clickjacking (no se puede meter en iframe externo)
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS) — Fuerza HTTPS
- `Content-Security-Policy` — Restringe orígenes de scripts, estilos, fuentes
- `Permissions-Policy` — Deshabilita cámara, micrófono, geolocalización

### Middleware Edge
- **Rate limiting**: Limita solicitudes por IP (5/min para API principales, 3/min para consentimiento)
- **Protección de rutas**: Redirige a `/` si se accede a `/portal-mfa` o `/consentimiento` sin los parámetros requeridos
- **Validación server-side**: Formato de email, tipo de derecho contra lista blanca, formato OTP (`/^\d{6}$/`), decisión contra allowlist

### Tokens de un solo uso
- Los links de consentimiento incluyen un `token` único generado por n8n y almacenado en HubSpot
- Una vez utilizado, el token se invalida

---

## 8. Flujo Completo End-to-End (Resumen Visual)

```
┌──────────────────────────────────────────────────────────────────┐
│                    SITIO WEB CYBERTRUST                         │
│                                                                  │
│   El cliente navega al portal ARSOP                             │
│   (actualmente en Render, se debe integrar a cybertrust.one)    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  PASO 1: FORMULARIO ARSOP (/)                                   │
│                                                                  │
│  • Email + Tipo de derecho + Mensaje                            │
│  • Se envía a /api/enviar-ARSOP → n8n                            │
│                                                                  │
│  ┌──────────────────┐    ┌────────────────────────┐             │
│  │ ¿Tiene           │ NO │ Se pausa la solicitud. │             │
│  │ consentimiento?  ├───►│ Se envía mail de       │             │
│  │                  │    │ consentimiento.         │             │
│  └────────┬─────────┘    │ → Ir a PASO 3          │             │
│           │ SÍ           └────────────────────────┘             │
│           ▼                                                      │
│  Solicitud ingresada al sistema                                  │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  PASO 2: VERIFICACIÓN MFA (/portal-mfa)                         │
│                                                                  │
│  • Cliente recibe email con link + código OTP de 6 dígitos      │
│  • Ingresa el código en la página                               │
│  • Se valida contra n8n                                          │
│  • Si es correcto → solicitud pasa al equipo de privacidad      │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  PASO 2b: GENERACIÓN DE RESPUESTA (n8n + IA)                    │
│                                                                  │
│  • Agente de IA consulta HubSpot (datos, contratos, historial)  │
│  • Genera respuesta formal según tipo de derecho                │
│  • Envía email al cliente con la respuesta                      │
│  • Plazo legal: 15 días hábiles                                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  PASO 3: CONSENTIMIENTO (/consentimiento)                        │
│                                                                  │
│  • Cliente recibe email con botones: ✓ Acepto / ✕ No Acepto    │
│  • Hace clic → llega a página de confirmación                   │
│  • Confirma su decisión                                          │
│  • Se registra en HubSpot                                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  OPCIONAL: CAMBIAR CONSENTIMIENTO (/cambiar-consentimiento)      │
│                                                                  │
│  • Cliente ingresa su email                                      │
│  • Se le envía nuevo mail de consentimiento                     │
│  • Puede cambiar su decisión en cualquier momento               │
└──────────────────────────────────────────────────────────────────┘
```
---

## 9. Variables de Entorno Requeridas

Si se integra al sitio, estas son las variables que se necesitan configurar:

```env
# Webhooks de n8n
N8N_WEBHOOK_URL=https://n8n.ejemplo.com/webhook/ARSOP-recepcion
N8N_OTP_VALIDATE_URL=https://n8n.ejemplo.com/webhook/validar-otp
N8N_CONSENT_EXECUTE_URL=https://n8n.ejemplo.com/webhook/ejecutar-consentimiento
N8N_CONSENT_REQUEST_URL=https://n8n.ejemplo.com/webhook/solicitar-cambio-consentimiento

# Token de autenticación compartido con n8n
N8N_WEBHOOK_SECRET=<token-secreto>
```

---

## 10. Diseño Visual

El portal usa un **diseño dark mode** con la siguiente paleta:

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

**Tipografía**: Google Font **Inter**.

> Si el sitio de CyberTrust usa un diseño diferente (light mode, otros colores), las páginas deben adaptarse visualmente para mantener consistencia de marca. Todos los estilos están centralizados en `app/globals.css`.

---

## 11. Consideraciones Legales

- **Ley 21.719**: Este sistema implementa los mecanismos requeridos por la ley chilena de protección de datos personales.
- **Plazo de respuesta**: 15 días hábiles desde la solicitud.
- **Derechos cubiertos**: Acceso, Rectificación, Supresión, Oposición, Portabilidad (ARSOP).
- **Consentimiento**: Se solicita antes de procesar cualquier solicitud. Se puede aceptar, rechazar o revocar en cualquier momento.
- **Verificación de identidad**: OTP de 6 dígitos con expiración de 10 minutos.
- **Registro**: Toda acción queda registrada con fecha y hora (timestamp) en el sistema.

---

## 12. Preguntas Frecuentes

**¿El portal accede directamente a la base de datos o a HubSpot?**  
No. Todo pasa a través de n8n. El portal solo necesita conectarse a los webhooks de n8n.

**¿Se puede usar el formulario sin n8n?**  
No. Los API routes dependen de n8n para procesar las solicitudes. Sin n8n activo, las llamadas fallarán con error 502/503.

**¿Los workflows de n8n están en este repositorio?**  
Sí, como archivos JSON de exportación pero no se incluyen públicamente aqui en Github. n8n corre como servicio separado — estos archivos son para respaldo y versionamiento.

**¿Qué pasa si el sitio de CyberTrust no usa Next.js?**  
Los API routes son simples proxies HTTP. Se pueden recrear en cualquier backend (Express, FastAPI, PHP, etc.) — lo único que hacen es validar campos y reenviar a n8n con un Bearer token.

---

## 13. Estructura de Archivos Resumida

```
ARSOP_cyber/
├── app/
│   ├── page.tsx                                    ← Formulario ARSOP principal
│   ├── portal-mfa/page.tsx                         ← Verificación OTP
│   ├── consentimiento/page.tsx                     ← Confirmación de consentimiento
│   ├── cambiar-consentimiento/page.tsx             ← Solicitar cambio de consentimiento
│   ├── globals.css                                 ← Estilos globales (dark mode)
│   ├── layout.tsx                                  ← Layout con Google Fonts
│   └── api/
│       ├── enviar-ARSOP/route.ts                    ← Proxy: formulario → n8n
│       ├── validar-otp/route.ts                    ← Proxy: OTP → n8n
│       ├── ejecutar-consentimiento/route.ts        ← Proxy: decisión → n8n
│       └── solicitar-cambio-consentimiento/route.ts ← Proxy: cambio → n8n
├── middleware.ts                                   ← Rate limiting + protección de rutas
├── next.config.mjs                                 ← Cabeceras de seguridad + redirects
└── .env                                            ← Variables de entorno (no versionado)
```
