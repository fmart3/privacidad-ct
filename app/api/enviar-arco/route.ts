import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, tipo_derecho, mensaje } = body;

    const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim().replace(/^['"]|['"]$/g, '');
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET?.trim().replace(/^['"]|['"]$/g, '');

    if (!webhookUrl || !webhookSecret) {
      return NextResponse.json({ detail: "Servidor no configurado correctamente." }, { status: 500 });
    }

    const payload = {
      email,
      tipo_derecho,
      mensaje,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${webhookSecret}`,
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

      if ((data as any).status === "consentimiento_requerido") {
        return NextResponse.json({ status: "consentimiento_requerido" });
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
