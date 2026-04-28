import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

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
    if (!id || !token || !['acepto', 'rechazado'].includes(respuesta ?? '')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal-mfa', '/consentimiento'],
};
