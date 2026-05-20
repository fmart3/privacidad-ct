import { NextResponse } from "next/server";

const TIPOS_DERECHO_VALIDOS = ['Acceso', 'Rectificación', 'Supresión', 'Oposición', 'Portabilidad'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, tipo_derecho, mensaje } = body;

    if (!email || !EMAIL_REGEX.test(String(email))) {
      return NextResponse.json({ detail: "Correo electrónico inválido." }, { status: 400 });
    }
    if (!tipo_derecho || !TIPOS_DERECHO_VALIDOS.includes(String(tipo_derecho))) {
      return NextResponse.json({ detail: "Tipo de derecho inválido." }, { status: 400 });
    }
    if (!mensaje || typeof mensaje !== 'string' || mensaje.trim().length === 0 || mensaje.length > 1000) {
      return NextResponse.json({ detail: "El mensaje es inválido o supera los 1000 caracteres." }, { status: 400 });
    }

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

      const wStatus = (data as any).status;
      if (wStatus === "cliente no exsite" || wStatus === "cliente no existe" || wStatus === "cliente_no_existe") {
        return NextResponse.json({ status: "cliente_no_existe" });
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
