// Runs before every matching page request and decides whether the visitor may continue.
import { NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from '@/lib/token';

export async function middleware(request) {
  const { pathname } = request.nextUrl;                       // The page being requested
  const token = request.cookies.get(COOKIE_NAME)?.value;      // The login cookie, if any
  const session = token ? await verifyToken(token) : null;    // Check the cookie is genuine

  // Visitors on the login page who are already signed in go straight to the dashboard
  if (pathname === '/login') {
    if (session) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
  }

  // Everything under /dashboard needs a valid session
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Administrative pages are for admins only
  const adminOnly = ['/dashboard/users', '/dashboard/audit-logs'];
  if (adminOnly.some((path) => pathname.startsWith(path)) && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const nurseOrAdminOnly = ['/dashboard/pharmacy', '/dashboard/billing'];
  if (nurseOrAdminOnly.some((path) => pathname.startsWith(path))
      && !['admin', 'nurse'].includes(session.role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Only run on these paths
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
