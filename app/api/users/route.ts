import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: number;
  display_name: string;
  role: 'user' | 'admin';
  created_at: string;
}

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  await initDB();
  const pool = getPool();

  const [rows] = await pool.execute<UserRow[]>(
    'SELECT id, display_name, role, created_at FROM users ORDER BY created_at ASC'
  );

  return NextResponse.json(rows);
}
