import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Validar formato de email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { detail: "Correo electrónico inválido." },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.N8N_CONSENT_REQUEST_URL?.trim().replace(/^['\"]|['\"]$/g, "");

    if (!webhookUrl) {
      return NextResponse.json(
        { detail: "Servidor no configurado correctamente." },
        { status: 500 }
      );
    }

    // El webhook peticion-consentimiento-individual espera form-urlencoded con { email }
    const body = new URLSearchParams({ email });
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });

    if (res.ok) {
      return NextResponse.json({ status: "ok" });
    }

    // n8n responde vacío si no encuentra el contacto (sin resultados en HubSpot)
    return NextResponse.json(
      {
        detail:
          "No encontramos una cuenta asociada a ese correo, o su estado actual no permite esta operación.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error en solicitar-nuevo-consentimiento:", error);
    return NextResponse.json(
      { detail: "Servicio temporalmente no disponible. Intente en unos minutos." },
      { status: 503 }
    );
  }
}
