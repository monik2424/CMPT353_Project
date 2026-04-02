import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface ReplyRow extends RowDataPacket {
  id: number;
  body: string;
  author_name: string;
  post_title: string;
  post_id: number;
  created_at: string;
}

// GET /api/admin/replies — all replies with author + post title (admin only)
export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  await initDB();
  const pool = getPool();

  const [rows] = await pool.execute<ReplyRow[]>(`
    SELECT r.id, r.body, r.post_id, r.created_at,
           u.display_name AS author_name,
           p.title        AS post_title
    FROM   replies r
    JOIN   users   u ON u.id = r.author_id
    JOIN   posts   p ON p.id = r.post_id
    ORDER BY r.created_at DESC
  `);

  return NextResponse.json(rows);
}
