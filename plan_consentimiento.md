# Plan: Link de "arrepentimiento" en el mail de consentimiento + Nueva página de cambio

## Descripción

El flujo actual (**0_Flujo de consentimeinto de uso de datos.json**) envía un mail al cliente pidiéndole que acepte o rechace el tratamiento de sus datos. El usuario quiere:

1. **Agregar un link al pie del mail de consentimiento** (el que envía n8n) con un texto como: *"En caso de que haya dado su respuesta y se arrepienta, puede cambiar su decisión aquí"* → redirige a `/cambiar-consentimiento`.
2. **Adaptar la página `/cambiar-consentimiento`** para que funcione como **punto de entrada único**: el cliente ingresa su email, se busca en HubSpot si es cliente (cualquier estado), y:
   - **Si existe** → se le dice que recibirá un mail con un enlace seguro para volver a dar su respuesta.
   - **Si no existe** → se le dice que no es cliente de la empresa y se le adjunta un link al sitio de contacto de CyberTrust.
3. **Agregar una sección en la página principal (`/`)** al pie con texto explicando que el cliente puede cambiar su estado de consentimiento, con un link a `/cambiar-consentimiento`.
4. Simplificar el flujo en n8n, ya que cualquier arrepentimiento o querer cambiar el consentimiento se debe manejar tan simple que con el activar el "Webhook" de solicitud consentimiento de contacto particular.
5. Los triggers de Hubspot se activaran en otro momento, el usuario aún debe setear sus credenciales para activar correctamente esos triggers. La idea es tener esos triggers para que:
  - Cada vez que se crea un cliente, su estado quede automáticamente en "Pendiente"
  - Hacer el envio del mail de consentimiento a cada nuevo cliente agregado y que tenga su propiedad "estado_consentimiento_arcop" en "Pendiente".
---

## Open Questions

> [!IMPORTANT]
> **URL sitio de contacto de CyberTrust es `https://cybertrust.one/`**

> [!IMPORTANT]
> **¿Cuál debe ser el comportamiento del n8n cuando llega el email de "arrepentimiento" desde `/cambiar-consentimiento`?**
> Actualmente la página tiene dos modos: "Volver a aceptar" y "Revocar". El usuario quiere simplificar la nueva pagina, que pida solo el email del cliente y se activa en n8n "Webhook" para el contacto particular pidiendo el consentimiento, entonces le llega un nuevo mail pidiendo consentimiento.
> 
> **Propuesta sugerida**: simplificar — el cliente solo ingresa su email. En n8n se busca el contacto con **cualquier** estado (`Aceptado`, `Rechazado`, `Pendiente`, `Revocado`) y se le manda el mail de consentimiento estándar (con los botones ✓ Acepto / ✕ No Acepto). Esto evita que el cliente tenga que saber su estado actual.

> [!NOTE]
El usuario quiere que en el primer mail (cuando el cliente está en "Pendiente") se diga que debe estar seguro de su decisión, pero ante cualquier cosa puede acceder al link de `/cambiar-consentimiento` para que le llegue un nuevo mail pidiendo consentimiento, tal cual como el primer mail.

---

## Cambios propuestos

### 1. n8n Workflow — Mail de consentimiento

#### [MODIFY] `0_Flujo de consentimeinto de uso de datos.json`

Al nodo **"Mail Solicitando Consentimiento de Trato de Datos"** se le agrega al final del `bodyContent` HTML (antes del cierre `</div></div>`) el siguiente bloque:

```html
<p style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
  ¿Ya respondió y desea cambiar su decisión?
  <a href="https://arco-cyber.vercel.app/cambiar-consentimiento" style="color: #0ea5e9;">
    Puede hacerlo aquí
  </a>
</p>
```

> Esto aplica también al nodo **"Nuevo Mail Arrepentimiento"** (el que se envía cuando el cliente rechazó y podría reconsiderar).

---

### 2. Página `/cambiar-consentimiento`

#### [MODIFY] `app/cambiar-consentimiento/page.tsx`

Se **simplifica** la página: eliminar los tabs "Volver a aceptar / Revocar" y reemplazar por un **flujo único**:

- Campo de email
- Al enviar:
  - **Éxito (cliente existe):** *"Hemos encontrado su cuenta. Le enviaremos un correo con un enlace seguro para que pueda revisar y actualizar su decisión de consentimiento."*
  - **Error 404 (no es cliente):** *"No encontramos una cuenta asociada a ese correo electrónico. Si tiene dudas, visite nuestra sección de contacto en [link a CyberTrust]."*
  - **Otros errores:** mensaje genérico.

> [!WARNING]
> Al simplificar la página, los dos tabs actuales ("Volver a aceptar" y "Revocar") desaparecen. El cliente podrá hacer ambas cosas desde el mail que recibirá (si n8n manda los botones acepto/rechazado/revocar). Confirmar si esto es aceptable.

---

### 3. Página principal `/`

#### [MODIFY] `app/page.tsx`

Se agrega **una sección al pie de la página** (antes del cierre del container o justo antes del footer) con un banner/card sutil, por ejemplo:

```
╔══════════════════════════════════════════════════════════╗
║  🔒  Gestión de su consentimiento                        ║
║  Si desea revisar o cambiar su decisión sobre el         ║
║  tratamiento de sus datos personales, puede hacerlo      ║
║  en cualquier momento.                                   ║
║                                  [Cambiar mi decisión →] ║
╚══════════════════════════════════════════════════════════╝
```

---

### 4. n8n Workflow — Nuevo webhook `solicitar-cambio-consentimiento`

#### [MODIFY] `0_Flujo de consentimeinto de uso de datos.json`

Se agrega un **nuevo sub-flujo**:
1. **Webhook** `POST /webhook/solicitar-cambio-consentimiento` (con auth)
2. **HubSpot Search** — busca el contacto por email con **cualquier estado** (sin filtro de estado, solo filtra por email)
3. **If** — ¿Se encontró el contacto?
   - **Sí** → Generar Token → Asignar Token en HubSpot → Enviar mail de consentimiento estándar → Responder `200`
   - **No** → Responder `404`

---

## Plan de verificación

### Pruebas frontend
- Verificar que el link en el pie del mail de consentimiento esté presente en el JSON del workflow.
- Acceder a `/cambiar-consentimiento` y probar con un email que sí existe en HubSpot → verificar mensaje de éxito.
- Acceder a `/cambiar-consentimiento` y probar con un email que no existe → verificar mensaje de "no es cliente" con link.
- Verificar que la sección en la página principal aparece al pie y el link funciona.

### Pruebas n8n
- Activar el nuevo webhook y probarlo desde Postman con un email válido e inválido.
- Confirmar que el mail enviado al cliente tiene el link de arrepentimiento al pie.

