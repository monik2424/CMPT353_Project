import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface PostRow extends RowDataPacket {
  id: number;
  title: string;
  author_name: string;
  channel_name: string;
  created_at: string;
}

// GET /api/admin/posts — all posts with author + channel (admin only)
export async function GET(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  await initDB();
  const pool = getPool();

  const [rows] = await pool.execute<PostRow[]>(`
    SELECT p.id, p.title, p.created_at,
           u.display_name AS author_name,
           c.name         AS channel_name
    FROM   posts    p
    JOIN   users    u ON u.id = p.author_id
    JOIN   channels c ON c.id = p.channel_id
    ORDER BY p.created_at DESC
  `);

  return NextResponse.json(rows);
}
