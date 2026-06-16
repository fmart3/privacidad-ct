export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { getN8nWebhookConfigSafe } from "@/lib/n8n";
import { verifyTurnstile } from "@/lib/turnstile";
import { submitConsentForm } from "@/lib/hubspot";

export async function POST(request: Request) {
  try {
    const { id, token, decision_datos, decision_marketing, turnstileToken } = await request.json();

    const captchaError = await verifyTurnstile(turnstileToken);
    if (captchaError) return captchaError;

    if (
      !id ||
      !token ||
      typeof decision_datos !== "string" ||
      !["acepto", "rechazo"].includes(decision_datos) ||
      typeof decision_marketing !== "string" ||
      !["acepto", "rechazo"].includes(decision_marketing) ||
      (decision_marketing === "acepto" && decision_datos === "rechazo")
    ) {
      return NextResponse.json({ detail: "Parámetros inválidos." }, { status: 400 });
    }

    const n8nConfig = getN8nWebhookConfigSafe("N8N_CONSENT_EXECUTE_URL");
    if (!n8nConfig) {
      return NextResponse.json({ detail: "Servidor no configurado correctamente." }, { status: 500 });
    }

    const res = await fetch(n8nConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${n8nConfig.secret}`,
      },
      body: JSON.stringify({ id, token, decision_datos, decision_marketing }),
      cache: "no-store",
    });

    if (res.status === 403 || res.status === 401) {
      return NextResponse.json({ status: "token_invalido" }, { status: 403 });
    }

    if (res.status !== 200 && res.status !== 201) {
      console.error(`n8n respondió con ${res.status}`);
      return NextResponse.json(
        { detail: "Error al procesar su solicitud. Intente nuevamente." },
        { status: 502 }
      );
    }

    // n8n OK: parsear email verificado de la respuesta
    if (decision_datos === "acepto") {
      let n8nData: { status?: string; email?: string } = {};
      try {
        n8nData = await res.json();
      } catch {
        // si n8n no devuelve JSON válido tratamos email como ausente
      }

      const email = n8nData.email;
      if (!email) {
        console.error("n8n no devolvió email en la respuesta de ejectuar-decision");
        return NextResponse.json(
          { detail: "No se pudo registrar el consentimiento en HubSpot: el servidor no devolvió el email verificado." },
          { status: 502 }
        );
      }

      const aceptaMarketing = decision_marketing === "acepto";
      const hsResult = await submitConsentForm({ email, aceptaMarketing });

      if (!hsResult.ok) {
        console.error("Error en HubSpot Forms Submission:", hsResult.error);
        return NextResponse.json(
          { detail: "Las preferencias fueron guardadas, pero ocurrió un error al registrar el consentimiento en HubSpot. Intente nuevamente." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error de conexión:", error);
    return NextResponse.json(
      { detail: "Servicio temporalmente no disponible. Intente en unos minutos." },
      { status: 503 }
    );
  }
}
