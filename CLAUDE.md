# Instrucciones para el Asistente AI (CLAUDE.md)

Actuarás como un **Desarrollador Senior en Python (FastAPI) y Arquitecto de Integraciones**. Este archivo contiene la arquitectura, directrices y contexto de negocio para el proyecto **Cybertrust Portal ARCO** — el portal público para la recepción de solicitudes de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición y Portabilidad) bajo la normativa de privacidad y la Ley 21.719.

---

## 1. Contexto del Negocio

- **Caso de uso principal:** Permitir a los usuarios externos (titulares de datos) enviar solicitudes para ejercer sus derechos ARCO de forma sencilla y segura a través de un formulario público.
- **Integración oficial:** Actualmente está desplegado en Render, pero la idea principal es que este portal quede embebido o forme parte como una **sección nueva para la página web oficial** de la empresa Cybertrust.
- **Privacidad por diseño:** Es un portal público, por lo que debe contar con protección CORS y un manejo seguro de los datos enviados antes de derivarlos al sistema interno (n8n).

---

## 2. Arquitectura y Flujo de Datos

**Mecanismo implementado:** Recepción vía FastAPI y reenvío asíncrono a **n8n**.

- El usuario ingresa a la raíz `/` y visualiza el formulario (`index.html`).
- Al enviar el formulario (vía `POST /enviar-arco`), FastAPI recibe `email`, `tipo_derecho` y `mensaje`.
- Se realiza una llamada asíncrona (`httpx`) al webhook de n8n configurado (`N8N_WEBHOOK_URL`), autenticado mediante Bearer Token (`N8N_WEBHOOK_SECRET`).
- Dependiendo de la respuesta de n8n, se muestra la página `success.html`. Si n8n responde con `status: "consentimiento_requerido"`, se muestra un mensaje especial indicando que la solicitud está pausada hasta que el usuario entregue su consentimiento. En caso contrario, se muestra un mensaje de éxito normal.

---

## 3. Estructura del Proyecto

```text
cybertrust_arco/
├── main.py                        # Punto de entrada (FastAPI, CORS, ruteo y llamadas HTTPX a n8n)
├── requirements.txt               # Dependencias del proyecto (fastapi, uvicorn, jinja2, httpx, etc.)
├── static/                        # Archivos estáticos (CSS, JS, imágenes, etc.)
├── templates/                     # Jinja2 HTML (server-side rendering)
│   ├── index.html                 # Formulario público de solicitud ARCO
│   └── success.html               # Página de confirmación (éxito o aviso de consentimiento requerido)
└── .env                           # Variables de entorno (no versionado)
```

---

## 4. Rutas y Endpoints

| Método | Endpoint | Template / Función | Descripción |
|---|---|---|---|
| `GET` | `/` | `index.html` | Muestra el formulario principal para ejercer derechos ARCO |
| `POST` | `/enviar-arco` | `success.html` | Procesa el formulario, envía payload a n8n y muestra el resultado |
| `GET` | `/enviar-arco` | Redirección | Redirige al inicio `/` si se accede vía GET accidentalmente |
| `GET` | `/health` | JSON | Endpoint para health check (usado por Render/Monitoreo) |

---

## 5. Integración con n8n

Este proyecto actúa como un frontend/proxy público para activar el flujo de n8n.

| Flujo Destino | Endpoint que lo invoca | Variable .env |
|---|---|---|
| ARCO_Recepcion | `POST /enviar-arco` | `N8N_WEBHOOK_URL` |

**Autenticación FastAPI→n8n:** Se utiliza un Bearer token definido en `N8N_WEBHOOK_SECRET` enviado en el header `Authorization`.

---

## 6. Variables de Entorno (`.env`)

| Variable | Descripción |
|---|---|
| `N8N_WEBHOOK_URL` | URL completa del webhook de n8n que recibe y procesa las solicitudes ARCO. |
| `N8N_WEBHOOK_SECRET` | Secret compartido para la autenticación Bearer con n8n. |

---

## 7. Comandos de Referencia Rápida

```bash
# Instalación de dependencias
pip install -r requirements.txt

# Ejecución local del servidor
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

---

## 8. Tecnologías y Stack

- **Backend:** Python 3, FastAPI, Uvicorn
- **Frontend:** Server-side rendering con Jinja2, HTML5, CSS
- **HTTP cliente:** `httpx` (async) para la comunicación sin bloqueos con n8n
- **Despliegue actual:** Render
- **Orquestación/Backend lógico:** n8n (Webhook receptor)

---

## 9. Directrices de Código y Futuro

1. **CORS:** El middleware `CORSMiddleware` está configurado con `allow_origins=["*"]`. **Importante:** Cuando este portal se integre definitivamente en la página oficial de la empresa, se debe cambiar `"*"` por el dominio oficial en producción para mejorar la seguridad.
2. **Asincronía:** Mantener el uso de `async with httpx.AsyncClient()` para evitar congelar el servidor en Render si n8n demora en responder.
3. **Manejo de Errores:** Las fallas de conexión hacia n8n están controladas y levantan `HTTPException` (502 o 503) para que el servidor no caiga abruptamente. No silenciar excepciones de red.
4. **Validación de Formularios:** Actualmente se usa `Form(...)` de FastAPI. Si en el futuro se agregan más campos (ej. archivos adjuntos o validaciones complejas), considerar el uso de modelos Pydantic o validaciones adicionales en el frontend.