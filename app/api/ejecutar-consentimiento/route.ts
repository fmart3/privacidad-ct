import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { id, token, decision } = await request.json();

    if (!id || !token || !["acepto", "rechazado"].includes(decision)) {
      return NextResponse.json({ detail: "Parámetros inválidos." }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_CONSENT_EXECUTE_URL?.trim().replace(/^['"]|['"]$/g, "");

    if (!webhookUrl) {
      return NextResponse.json({ detail: "Servidor no configurado correctamente." }, { status: 500 });
    }

    const params = new URLSearchParams({ id, token, decision });
    const res = await fetch(`${webhookUrl}?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, token, decision }),
      cache: "no-store",
    });

    if (res.status === 200 || res.status === 201) {
      return NextResponse.json({ status: "ok" });
    }

    if (res.status === 403 || res.status === 401) {
      return NextResponse.json({ status: "token_invalido" }, { status: 403 });
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
