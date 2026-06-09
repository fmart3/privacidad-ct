export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getN8nWebhookConfigSafe } from "@/lib/n8n";

const TIPOS_DERECHO_VALIDOS = ['Acceso', 'Rectificación', 'Supresión', 'Oposición', 'Portabilidad'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, tipo_derecho, mensaje, turnstileToken } = body;

    if (!turnstileToken) {
      return NextResponse.json({ detail: "Falta la verificación de seguridad (CAPTCHA)." }, { status: 400 });
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim().replace(/^['"]|['"]$/g, '');
    if (turnstileSecret) {
      const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken,
        }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyData.success) {
        console.error("Error en validación Turnstile:", verifyData);
        return NextResponse.json({ detail: "Falló la verificación de seguridad (CAPTCHA). Códigos: " + (verifyData['error-codes']?.join(', ') || 'Desconocido') }, { status: 403 });
      }
    } else {
      console.warn("TURNSTILE_SECRET_KEY no está configurado, omitiendo validación del token.");
    }

    if (!email || !EMAIL_REGEX.test(String(email))) {
      return NextResponse.json({ detail: "Correo electrónico inválido." }, { status: 400 });
    }
    if (!tipo_derecho || !TIPOS_DERECHO_VALIDOS.includes(String(tipo_derecho))) {
      return NextResponse.json({ detail: "Tipo de derecho inválido." }, { status: 400 });
    }
    const mostrarMensaje = ['Rectificación', 'Supresión', 'Oposición'].includes(String(tipo_derecho));
    if (mostrarMensaje) {
      if (!mensaje || typeof mensaje !== 'string' || mensaje.trim().length === 0 || mensaje.length > 1000) {
        return NextResponse.json({ detail: "El mensaje es obligatorio para el derecho seleccionado y no puede superar los 1000 caracteres." }, { status: 400 });
      }
    }

    const n8nConfig = getN8nWebhookConfigSafe("N8N_ARSOP_SEND_URL");
    if (!n8nConfig) {
      return NextResponse.json({ detail: "Servidor no configurado correctamente." }, { status: 500 });
    }

    const payload = {
      email,
      tipo_derecho,
      mensaje: mostrarMensaje ? mensaje : "",
    };

    const response = await fetch(n8nConfig.url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${n8nConfig.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      // Next.js fetch API config
      cache: 'no-store'
    });

    if (response.status === 200 || response.status === 201 || response.status === 202) {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        // Fallback for empty JSON response
      }

      const wStatus = (data as any).status;
      if (wStatus === "cliente no existe" || wStatus === "cliente_no_existe") {
        return NextResponse.json({ status: "cliente_no_existe" });
      } else {
        return NextResponse.json({ status: "ok" });
      }
    } else {
      console.error(`Error de n8n: ${response.status} - ${await response.text()}`);
      return NextResponse.json({ detail: "Error de comunicación con nuestro Agente de Privacidad." }, { status: 502 });
    }
  } catch (error) {
    console.error("Error de conexión:", error);
    return NextResponse.json({ detail: "Servicio temporalmente no disponible. Intente en unos minutos." }, { status: 503 });
  }
}
