import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiter de ventana fija
const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = {
  '/api/enviar-arsop': 5,
  '/api/validar-otp': 5,
  '/api/ejecutar-consentimiento': 5,
  '/api/solicitar-cambio-consentimiento': 5
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

function pruneStore() {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now >= entry.resetAt) store.delete(key);
  });
}

let lastPrune = Date.now();

function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    // En desarrollo, Next.js ejecuta los módulos con eval(), por lo que el CSP
    // estricto rompe la hidratación local. 'unsafe-eval' solo se agrega en dev.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''
    } https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

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

  // CSP con nonce por request (solo para respuestas de página, no APIs)
  if (!pathname.startsWith('/api/')) {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    const csp = buildCSP(nonce);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', csp);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
