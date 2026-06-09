export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getN8nWebhookConfigSafe } from "@/lib/n8n";

export async function POST(request: Request) {
  try {
    const { email, turnstileToken } = await request.json();

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

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ detail: "Correo electrónico inválido." }, { status: 400 });
    }

    const n8nConfig = getN8nWebhookConfigSafe("N8N_CONSENT_REQUEST_URL");
    if (!n8nConfig) {
      return NextResponse.json(
        { detail: "Servidor no configurado correctamente." },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${n8nConfig.secret}`,
    };

    const res = await fetch(n8nConfig.url, {
      method: "POST",
      headers,
      body: new URLSearchParams({ email }).toString(),
      cache: "no-store",
    });

    if (res.status === 200) {
      return NextResponse.json({ status: "ok" });
    }

    if (res.status === 404) {
      return NextResponse.json({ detail: "no_encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      { detail: "Error al procesar su solicitud. Intente nuevamente." },
      { status: 502 }
    );
  } catch (error) {
    console.error("Error en solicitar-cambio-consentimiento:", error);
    return NextResponse.json(
      { detail: "Servicio temporalmente no disponible. Intente en unos minutos." },
      { status: 503 }
    );
  }
}
