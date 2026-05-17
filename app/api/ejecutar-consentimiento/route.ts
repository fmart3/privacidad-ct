import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { id, token, decision_datos, decision_marketing } = await request.json();

    if (
      !id ||
      !token ||
      typeof decision_datos !== "boolean" ||
      typeof decision_marketing !== "boolean" ||
      (decision_marketing && !decision_datos)
    ) {
      return NextResponse.json({ detail: "Parámetros inválidos." }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_CONSENT_EXECUTE_URL?.trim().replace(/^['"]|['"]$/g, "");
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET?.trim().replace(/^['"]|['"]$/g, "");

    if (!webhookUrl || !webhookSecret) {
      return NextResponse.json({ detail: "Servidor no configurado correctamente." }, { status: 500 });
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${webhookSecret}`,
      },
      body: JSON.stringify({ id, token, decision_datos, decision_marketing }),
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
