import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ detail: "Correo electrónico inválido." }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_CONSENT_REQUEST_URL?.trim().replace(/^['"]|['"]$/g, "");
    
    if (!webhookUrl) {
      return NextResponse.json(
        { detail: "Servidor no configurado correctamente." },
        { status: 500 }
      );
    }

    const webhookSecret = process.env.N8N_WEBHOOK_SECRET?.trim().replace(/^['"]|['"]$/g, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (webhookSecret) {
      headers["Authorization"] = `Bearer ${webhookSecret}`;
    }

    const res = await fetch(webhookUrl, {
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
