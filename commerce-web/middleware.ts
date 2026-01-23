import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookies, verifyAuthToken } from './src/lib/auth';

const ADMIN_API_PREFIXES = ['/api/admin', '/api/orders/refund'];
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const isStaticAsset = (pathname: string) =>
  pathname.startsWith('/_next') ||
  pathname.startsWith('/favicon') ||
  pathname.startsWith('/static') ||
  pathname.startsWith('/public');

const isAdminPage = (pathname: string) => pathname.startsWith('/admin');

function isAdminApi(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ADMIN_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;

  // Product mutations are admin-only; product GET remains public
  if (pathname.startsWith('/api/products') && MUTATING_METHODS.has(request.method)) return true;

  return false;
}

function buildLoginRedirect(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) return NextResponse.next();
  if (pathname.startsWith('/api/webhooks')) return NextResponse.next();
  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  const token = getTokenFromCookies(request.cookies);
  const user = token ? await verifyAuthToken(token) : null;

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAdminPage(pathname) || isAdminApi(request)) {
    if (!user) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return buildLoginRedirect(request);
    }

    if (user.role !== 'admin') {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*', '/login'],
};
