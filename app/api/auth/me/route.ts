import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// GET /api/auth/me — returns the logged-in user from JWT cookie
export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }
  return NextResponse.json({ id: user.id, display_name: user.display_name, role: user.role });
}
