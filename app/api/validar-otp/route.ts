export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { getN8nWebhookConfigSafe } from "@/lib/n8n";
import { verifyTurnstile } from "@/lib/turnstile";
import { getFails, bumpFail, clearFails } from "@/lib/otpAttempts";

export async function POST(request: Request) {
  try {
    const { ticket, otp, turnstileToken } = await request.json();

    if (
      !ticket ||
      typeof ticket !== 'string' ||
      ticket.length > 128 ||
      !/^[a-zA-Z0-9_-]+$/.test(ticket) ||
      !otp ||
      !/^\d{6}$/.test(otp)
    ) {
      return NextResponse.json({ detail: "Parámetros inválidos." }, { status: 400 });
    }

    // Turnstile progresivo: exigir CAPTCHA a partir del primer fallo del ticket.
    // La decisión es autoritativa del servidor; el cliente no puede saltársela.
    const fails = getFails(ticket);
    if (fails >= 1) {
      const captchaError = await verifyTurnstile(turnstileToken);
      if (captchaError) {
        return NextResponse.json({ status: "captcha_required" }, { status: 403 });
      }
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
        bumpFail(ticket);
        return NextResponse.json({ status: "otp_invalido", requireCaptcha: true }, { status: 401 });
      }
      if (data.status === "otp_expirado") {
        return NextResponse.json({ status: "otp_expirado" }, { status: 410 });
      }
      clearFails(ticket);
      return NextResponse.json({ status: "ok" });
    }

    if (res.status === 401) {
      bumpFail(ticket);
      return NextResponse.json({ status: "otp_invalido", requireCaptcha: true }, { status: 401 });
    }
    if (res.status === 410) {
      return NextResponse.json({ status: "otp_expirado" }, { status: 410 });
    }
    if (res.status === 404) {
      return NextResponse.json({ status: "ticket_invalido" }, { status: 404 });
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
