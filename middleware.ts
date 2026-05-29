import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiter de ventana fija
const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = {
  '/api/enviar-arsop': 5,
  '/api/validar-otp': 5,
  '/api/ejecutar-consentimiento': 5,
  '/api/solicitar-nuevo-consentimiento': 3,
  '/api/solicitar-revocacion': 3,
};

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

function isRateLimited(key: string, max: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= max) return true;

  entry.count++;
  return false;
}

// Limpia entradas expiradas periódicamente para evitar crecimiento ilimitado
function pruneStore() {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now >= entry.resetAt) store.delete(key);
  });
}

let lastPrune = Date.now();

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Limpia cada 5 minutos
  if (Date.now() - lastPrune > 300_000) {
    pruneStore();
    lastPrune = Date.now();
  }

  // Rate limiting para API routes
  const limit = LIMITS[pathname];
  if (limit !== undefined) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip =
      (forwarded ? forwarded.split(',').at(-1)?.trim() : undefined) ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const key = `${pathname}:${ip}`;

    if (isRateLimited(key, limit)) {
      return NextResponse.json(
        { detail: 'Demasiadas solicitudes. Intente nuevamente en un minuto.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Redirige a /portal-mfa y /consentimiento si faltan parámetros
  if (pathname === '/portal-mfa') {
    const ticket = searchParams.get('ticket');
    if (!ticket) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (pathname === '/consentimiento') {
    const id = searchParams.get('id');
    const token = searchParams.get('token');
    if (!id || !token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/enviar-arsop',
    '/api/validar-otp',
    '/api/ejecutar-consentimiento',
    '/api/solicitar-nuevo-consentimiento',
    '/api/solicitar-revocacion',
    '/portal-mfa',
    '/consentimiento',
  ],
};
