import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fixed-window rate limiter (in-memory, per worker instance)
// Adequate for single-instance Render deployments
const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = {
  '/api/enviar-arco': 5,
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

// Prune expired entries periodically to avoid unbounded growth
function pruneStore() {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now >= entry.resetAt) store.delete(key);
  });
}

let lastPrune = Date.now();

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Prune every 5 minutes
  if (Date.now() - lastPrune > 300_000) {
    pruneStore();
    lastPrune = Date.now();
  }

  // Rate limiting for API routes
  const limit = LIMITS[pathname];
  if (limit !== undefined) {
    // Use the last entry in x-forwarded-for: Render's load balancer appends the real
    // client IP at the end, so it cannot be spoofed by a crafted request header.
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

  // Redirect /portal-mfa and /consentimiento if required params are missing
  if (pathname === '/portal-mfa') {
    const ticket = searchParams.get('ticket');
    const email = searchParams.get('email');
    if (!ticket || !email) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (pathname === '/consentimiento') {
    const id = searchParams.get('id');
    const token = searchParams.get('token');
    const respuesta = searchParams.get('respuesta');
    if (!id || !token || !['acepto', 'rechazado', 'revocado'].includes(respuesta ?? '')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/enviar-arco',
    '/api/validar-otp',
    '/api/ejecutar-consentimiento',
    '/api/solicitar-nuevo-consentimiento',
    '/api/solicitar-revocacion',
    '/portal-mfa',
    '/consentimiento',
  ],
};
