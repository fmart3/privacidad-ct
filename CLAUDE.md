# Instrucciones para el Asistente AI (CLAUDE.md)

Actuarás como un **Desarrollador Senior en Next.js (TypeScript) y Arquitecto de Integraciones**. Este archivo contiene la arquitectura, directrices y contexto del proyecto **Cybertrust Portal ARCO** — portal público para la recepción de solicitudes de derechos ARCO bajo la Ley 21.719.

---

## 1. Contexto del Negocio

- **Caso de uso principal:** Permitir a titulares de datos enviar solicitudes ARCO (Acceso, Rectificación, Supresión, Oposición, Portabilidad) de forma pública y segura.
- **Integración:** Desplegado en Render. La idea es que quede embebido o integrado en la página oficial de Cybertrust.
- **Privacidad por diseño:** Portal público con validación server-side, cabeceras de seguridad y reenvío seguro a n8n.

---

## 2. Arquitectura y Flujo de Datos

- El usuario accede a `/` y completa el formulario ARCO.
- El formulario llama a `POST /api/enviar-arco` (Next.js Route Handler), que valida los campos y reenvía a n8n via Bearer Token.
- n8n puede responder `status: "consentimiento_requerido"` → se informa al usuario y se le envía un correo con link de consentimiento.
- El link de consentimiento apunta a `/consentimiento?id=...&token=...&respuesta=acepto|rechazado`.
- Para verificar identidad vía OTP, se usa `/portal-mfa?ticket=...&email=...`.

---

## 3. Estructura del Proyecto

```text
arco_cyber/
├── middleware.ts                        # Edge Middleware: protege /portal-mfa y /consentimiento
├── next.config.mjs                      # Config Next.js: security headers + redirects
├── app/
│   ├── layout.tsx                       # Layout global (Google Fonts, metadata)
│   ├── page.tsx                         # Formulario principal ARCO
│   ├── portal-mfa/page.tsx              # Verificación de identidad OTP (6 dígitos)
│   ├── consentimiento/page.tsx          # Confirmación de decisión de consentimiento
│   └── api/
│       ├── enviar-arco/route.ts         # POST: recibe formulario ARCO, reenvía a n8n
│       ├── validar-otp/route.ts         # POST: valida código OTP con n8n
│       └── ejecutar-consentimiento/route.ts  # POST: registra decisión de consentimiento en n8n
└── .env                                 # Variables de entorno (no versionado)
```

---

## 4. Rutas y Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/` | Formulario público ARCO |
| `POST` | `/api/enviar-arco` | Procesa solicitud ARCO → n8n |
| `GET` | `/portal-mfa?ticket=&email=` | Verificación OTP (requiere params; sin ellos el middleware redirige a `/`) |
| `POST` | `/api/validar-otp` | Valida OTP con n8n |
| `GET` | `/consentimiento?id=&token=&respuesta=` | Confirmación de consentimiento (requiere params; sin ellos el middleware redirige a `/`) |
| `POST` | `/api/ejecutar-consentimiento` | Registra decisión de consentimiento en n8n |

---

## 5. Variables de Entorno (`.env`)

| Variable | Descripción |
|---|---|
| `N8N_WEBHOOK_URL` | Webhook n8n para recibir solicitudes ARCO |
| `N8N_OTP_VALIDATE_URL` | Webhook n8n para validar OTP |
| `N8N_CONSENT_EXECUTE_URL` | Webhook n8n para ejecutar decisión de consentimiento |
| `N8N_WEBHOOK_SECRET` | Bearer token compartido para autenticar FastAPI→n8n |

---

## 6. Seguridad

**Cabeceras HTTP** (aplicadas a todas las rutas en `next.config.mjs`):
- `X-Frame-Options: DENY` — previene clickjacking
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy`: restringe orígenes de scripts/estilos/fuentes; bloquea `frame-ancestors`, `object-src` y `base-uri`

**Middleware Edge** (`middleware.ts`): redirige a `/` si se accede a `/portal-mfa` o `/consentimiento` sin los query params requeridos, antes de que el browser descargue el JS de la página.

**Validación server-side** en todos los API routes: formato de email, `tipo_derecho` contra lista de valores válidos, longitud de mensaje, formato OTP (`/^\d{6}$/`), y `decision` contra allowlist.

**Pendiente:** Next.js 16.x resuelve vulnerabilidades high restantes (`npm audit fix --force` es un cambio breaking que requiere pruebas).

---

## 7. Comandos de Referencia Rápida

```bash
npm run dev      # Servidor local en http://localhost:3000
npm run build    # Build de producción
npm run lint     # Lint TypeScript
npm audit        # Revisar vulnerabilidades de dependencias
```

---

## 8. Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Despliegue:** Render
- **Orquestación:** n8n (webhook receptor con Bearer Token)
