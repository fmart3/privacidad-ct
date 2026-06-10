import { NextResponse } from "next/server";

/**
 * Verifica el token de Turnstile.
 * - Retorna null si la verificación es exitosa (proceder normalmente).
 * - Retorna un NextResponse con error si falla.
 * - En producción, falla en modo fail-closed si falta TURNSTILE_SECRET_KEY.
 */
export async function verifyTurnstile(token: string | null | undefined): Promise<NextResponse | null> {
  if (!token) {
    return NextResponse.json(
      { detail: "Falta la verificación de seguridad (CAPTCHA)." },
      { status: 400 }
    );
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim().replace(/^['"]|['"]$/g, '');

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error("TURNSTILE_SECRET_KEY no configurado en producción — denegando request (fail-closed).");
      return NextResponse.json(
        { detail: "Servidor no configurado correctamente." },
        { status: 500 }
      );
    }
    console.warn("TURNSTILE_SECRET_KEY no configurado, omitiendo validación (solo en desarrollo).");
    return null;
  }

  const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await verifyResponse.json();

  if (!data.success) {
    console.error("Turnstile: verificación fallida. Códigos:", data['error-codes']);
    return NextResponse.json(
      { detail: "Falló la verificación de seguridad." },
      { status: 403 }
    );
  }

  return null;
}
