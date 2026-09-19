import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  // Protect /dashboard, /vehicles, /admin, /profile, /settings, /bookings, /wallet
  const protectedPaths = ['/dashboard', '/bookings', '/wallet', '/admin', '/vehicles', '/profile', '/settings'];
  const isProtectedPath = protectedPaths.some((path) => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged in users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some((path) => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/bookings/:path*', 
    '/wallet/:path*', 
    '/admin/:path*',
    '/vehicles/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/login',
    '/signup'
  ],
};
