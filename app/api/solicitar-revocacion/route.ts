import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ detail: "Correo electrónico inválido." }, { status: 400 });
    }

    // Aquí deberías poner la URL real de tu webhook de solicitar-revocacion de n8n
    // Lo ideal es tenerla en el .env, pero por ahora usaremos la URL base que ya tienes
    // Reemplaza el ID del webhook con el correcto si es necesario
    const n8nDomain = "https://pepelagos.app.n8n.cloud";
    const webhookUrl = `${n8nDomain}/webhook/solicitar-revocacion`;
    
    // Si usas auth en este webhook, añádelo aquí
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET?.trim().replace(/^['"]|['"]$/g, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (webhookSecret) {
      headers["Authorization"] = `Bearer ${webhookSecret}`;
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 200) {
      return NextResponse.json({ status: "ok" });
    }

    if (res.status === 404 || data.status === "no_encontrado") {
      return NextResponse.json(
        { detail: "No encontramos un consentimiento activo ('Aceptado') para este correo." },
        { status: 404 }
      );
    }

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
