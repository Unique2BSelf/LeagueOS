import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from './src/lib/auth';

const PROTECTED_PREFIXES = ['/dashboard'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('leagueos_session')?.value;
  const session = await verifySessionToken(token);
  const pathname = request.nextUrl.pathname;

  if (isProtectedPath(pathname) && !session) {
    const loginUrl = new URL('/login', request.url);
    const redirectPath = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set('redirect', redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set('x-user-id', session.userId);
  headers.set('x-user-role', session.role);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
