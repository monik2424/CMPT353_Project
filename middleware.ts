import { NextRequest, NextResponse } from 'next/server';

// Follows Week11 pattern: check cookie existence only.
// JWT verification and role check happen inside each page/API route.
export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
