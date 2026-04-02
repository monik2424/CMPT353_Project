import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface PostRow extends RowDataPacket {
  id: number;
  channel_id: number;
  author_id: number;
  title: string;
  body: string;
  created_at: string;
  author_name: string;
}

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/posts/[id] — fetch a single post with author name
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await initDB();
  const pool = getPool();
  const { id } = await params;

  const [rows] = await pool.execute<PostRow[]>(`
    SELECT p.id, p.channel_id, p.author_id, p.title, p.body, p.created_at,
           u.display_name AS author_name
    FROM   posts p
    JOIN   users u ON u.id = p.author_id
    WHERE  p.id = ?
  `, [id]);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

// DELETE /api/posts/[id] — admin only
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  await initDB();
  const pool = getPool();
  const { id } = await params;

  await pool.execute('DELETE FROM posts WHERE id = ?', [id]);
  return NextResponse.json({ message: 'Post deleted' });
}
