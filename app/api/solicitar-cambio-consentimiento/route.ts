export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { getN8nWebhookConfigSafe } from "@/lib/n8n";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  try {
    const { email, turnstileToken } = await request.json();

    const captchaError = await verifyTurnstile(turnstileToken);
    if (captchaError) return captchaError;

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

    const res = await fetch(n8nConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${n8nConfig.secret}`,
      },
      body: new URLSearchParams({ email }).toString(),
      cache: "no-store",
    });

    if (res.status === 200 || res.status === 404) {
      return NextResponse.json({ status: "ok" });
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
