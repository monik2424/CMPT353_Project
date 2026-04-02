import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/replies/[id] — admin only
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  await initDB();
  const pool = getPool();
  const { id } = await params;

  await pool.execute('DELETE FROM replies WHERE id = ?', [id]);
  return NextResponse.json({ message: 'Reply deleted' });
}
