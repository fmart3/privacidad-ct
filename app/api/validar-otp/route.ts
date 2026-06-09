export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getN8nWebhookConfigSafe } from "@/lib/n8n";

export async function POST(request: Request) {
  try {
    const { ticket, otp } = await request.json();

    if (!ticket || !otp || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ detail: "Parámetros inválidos." }, { status: 400 });
    }

    const n8nConfig = getN8nWebhookConfigSafe("N8N_OTP_VALIDATE_URL");
    if (!n8nConfig) {
      return NextResponse.json({ detail: "Servidor no configurado correctamente." }, { status: 500 });
    }

    const res = await fetch(n8nConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${n8nConfig.secret}`
      },
      body: JSON.stringify({ ticket, otp }),
      cache: "no-store",
    });

    if (res.status === 200 || res.status === 201) {
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* empty body */ }

      if (data.status === "otp_invalido") {
        return NextResponse.json({ status: "otp_invalido" }, { status: 401 });
      }
      if (data.status === "otp_expirado") {
        return NextResponse.json({ status: "otp_expirado" }, { status: 410 });
      }
      return NextResponse.json({ status: "ok" });
    }

    if (res.status === 401) {
      return NextResponse.json({ status: "otp_invalido" }, { status: 401 });
    }
    if (res.status === 410) {
      return NextResponse.json({ status: "otp_expirado" }, { status: 410 });
    }

    console.error(`n8n respondió con ${res.status}`);
    return NextResponse.json(
      { detail: "Error al procesar su solicitud. Intente nuevamente." },
      { status: 502 }
    );
  } catch (error) {
    console.error("Error de conexión:", error);
    return NextResponse.json(
      { detail: "Servicio temporalmente no disponible. Intente en unos minutos." },
      { status: 503 }
    );
  }
}
