export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { getN8nWebhookConfigSafe } from "@/lib/n8n";

export async function POST(request: Request) {
  try {
    const { id, token } = await request.json();

    if (!id || !token) {
      return NextResponse.json({ detail: "Parámetros inválidos." }, { status: 400 });
    }

    const n8nConfig = getN8nWebhookConfigSafe("N8N_CONSENT_STATE_URL");
    if (!n8nConfig) {
      return NextResponse.json({ detail: "Servidor no configurado correctamente." }, { status: 500 });
    }

    const res = await fetch(n8nConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${n8nConfig.secret}`,
      },
      body: JSON.stringify({ id, token }),
      cache: "no-store",
    });

    if (res.status === 403 || res.status === 401) {
      return NextResponse.json({ status: "token_invalido" }, { status: 403 });
    }

    if (!res.ok) {
      console.error(`n8n estado-consentimiento respondió con ${res.status}`);
      return NextResponse.json(
        { detail: "Error al obtener el estado. Intente nuevamente." },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ datos: data.datos ?? null, marketing: data.marketing ?? false });
  } catch (error) {
    console.error("Error en estado-consentimiento:", error);
    return NextResponse.json(
      { detail: "Servicio temporalmente no disponible." },
      { status: 503 }
    );
  }
}
