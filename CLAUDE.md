# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**Cybertrust Portal ARCO** — portal público para la recepción de solicitudes de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición, Portabilidad) bajo la Ley 21.719 (Chile). Desplegado en Render. Diseñado para quedar embebido o integrado en la página oficial de Cybertrust.

No hay tests. No hay base de datos propia: toda la lógica de negocio vive en n8n, que actúa como backend orquestador. El portal es únicamente un frontend validador + proxy hacia webhooks n8n autenticados con Bearer Token.

---

## Comandos

```bash
npm run dev      # http://localhost:3000
npm run build    # Build de producción
npm run lint     # TypeScript lint
npm audit        # Revisar vulnerabilidades
```

---

## Arquitectura y Flujo de Datos

### Flujo ARCO principal
1. Usuario llena el formulario en `/` → `POST /api/enviar-arco` → n8n
2. Si n8n responde `{ status: "consentimiento_requerido" }`, se informa al usuario y n8n envía un correo con enlace a `/consentimiento?id=…&token=…`
3. `/consentimiento` muestra la política de privacidad y dos checkboxes; al confirmar llama a `POST /api/ejecutar-consentimiento` con `{ id, token, decision_datos: boolean, decision_marketing: boolean }`

### Flujo OTP / MFA
- n8n envía al usuario un enlace a `/portal-mfa?ticket=…&email=…`
- El usuario ingresa el código de 6 dígitos → `POST /api/validar-otp` → n8n

### Flujo cambio de consentimiento
- El usuario accede a `/cambiar-consentimiento`, ingresa su email
- `POST /api/solicitar-cambio-consentimiento` → n8n (envía `email` como `application/x-www-form-urlencoded`)
- n8n verifica si el email existe (responde 404 si no) y envía nuevo enlace de consentimiento

---

## Rutas y Endpoints

| Ruta | Descripción |
|---|---|
| `GET /` | Formulario público ARCO |
| `POST /api/enviar-arco` | Valida `{ email, tipo_derecho, mensaje }` y reenvía a n8n |
| `GET /portal-mfa?ticket=&email=` | Verificación OTP — middleware redirige a `/` sin estos params |
| `POST /api/validar-otp` | Valida código OTP (`/^\d{6}$/`) con n8n |
| `GET /consentimiento?id=&token=` | Muestra política + checkboxes — middleware redirige a `/` sin `id` y `token` |
| `POST /api/ejecutar-consentimiento` | Envía `{ id, token, decision_datos, decision_marketing }` a n8n |
| `GET /cambiar-consentimiento` | Formulario para solicitar nuevo enlace de consentimiento por email |
| `POST /api/solicitar-cambio-consentimiento` | Busca email en n8n y dispara envío de nuevo enlace |

Redirects definidos en `next.config.mjs`: `/webhook/portal-mfa` → `/portal-mfa`, `/webhook/consentimiento` → `/consentimiento`, `/portal_mfa` → `/portal-mfa`.

---

## Variables de Entorno (`.env`)

| Variable | Uso |
|---|---|
| `N8N_WEBHOOK_URL` | Webhook n8n para recibir solicitudes ARCO |
| `N8N_OTP_VALIDATE_URL` | Webhook n8n para validar OTP |
| `N8N_CONSENT_EXECUTE_URL` | Webhook n8n para ejecutar decisión de consentimiento |
| `N8N_CONSENT_REQUEST_URL` | Webhook n8n para solicitar nuevo enlace de consentimiento |
| `N8N_WEBHOOK_SECRET` | Bearer token compartido para autenticar Next.js → n8n |

Todos los route handlers hacen `.trim().replace(/^['"]|['"]$/g, "")` al leer las env vars para tolerar comillas accidentales en el archivo `.env`.

---

## Middleware (`middleware.ts`)

Dos responsabilidades:

1. **Rate limiting por IP** (ventana fija de 60 s, en memoria — válido para instancia única en Render):
   - `/api/enviar-arco`, `/api/validar-otp`, `/api/ejecutar-consentimiento`: 5 req/min
   - `/api/solicitar-nuevo-consentimiento`, `/api/solicitar-revocacion`: 3 req/min
   - IP extraída del último valor de `x-forwarded-for` (Render agrega la IP real al final).

2. **Guard de params requeridos**: redirige a `/` si se accede a `/portal-mfa` sin `ticket`+`email`, o a `/consentimiento` sin `id`+`token`.

---

## Seguridad

Cabeceras HTTP en `next.config.mjs` (aplicadas a `/(.*)`): `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`, `Permissions-Policy`, `CSP` (bloquea `frame-ancestors`, `object-src`, `base-uri`; permite inline styles y Google Fonts).

Validación server-side en todos los route handlers: email con regex, `tipo_derecho` contra allowlist `['Acceso','Rectificación','Supresión','Oposición','Portabilidad']`, mensaje ≤ 1000 chars, OTP `/^\d{6}$/`, `decision_datos`/`decision_marketing` como booleanos con la restricción `decision_marketing=true` requiere `decision_datos=true`.

**Pendiente:** `npm audit fix --force` actualizaría a Next.js 16.x (cambio breaking, requiere pruebas antes de aplicar).

---

## Stack

- **Framework:** Next.js (App Router), TypeScript — sin componentes de servidor de datos, todo `"use client"` excepto los route handlers
- **Estilos:** CSS global en `app/globals.css` con variables CSS (`--accent`, `--success`, `--danger`, `--border`, `--text`, `--text-muted`); sin librería de componentes
- **Despliegue:** Render (instancia única)
- **Orquestación:** n8n (workflows en `n8n_workflows/`)
