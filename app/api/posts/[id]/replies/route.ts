import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface ReplyRow extends RowDataPacket {
  id: number;
  post_id: number;
  parent_reply_id: number | null;
  author_id: number;
  body: string;
  created_at: string;
  author_name: string;
}

interface PostRow extends RowDataPacket {
  id: number;
}

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/posts/[id]/replies — list all replies for a post (flat, oldest-first)
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await initDB();
  const pool = getPool();
  const { id } = await params;

  const [post] = await pool.execute<PostRow[]>(
    'SELECT id FROM posts WHERE id = ?', [id]
  );
  if (post.length === 0) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const [rows] = await pool.execute<ReplyRow[]>(`
    SELECT r.id, r.post_id, r.parent_reply_id, r.author_id, r.body, r.created_at,
           u.display_name AS author_name
    FROM   replies r
    JOIN   users   u ON u.id = r.author_id
    WHERE  r.post_id = ?
    ORDER BY r.created_at ASC
  `, [id]);

  return NextResponse.json(rows);
}

// POST /api/posts/[id]/replies — add a reply to a post
export async function POST(req: NextRequest, { params }: RouteParams) {
  await initDB();
  const pool = getPool();
  const { id } = await params;

  const [post] = await pool.execute<PostRow[]>(
    'SELECT id FROM posts WHERE id = ?', [id]
  );
  if (post.length === 0) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const body            = await req.json();
  const replyBody       = (body.body ?? '').trim();
  const author_id       = body.author_id;
  const parent_reply_id = body.parent_reply_id ?? null;

  if (!replyBody)  return NextResponse.json({ error: 'Body is required' },      { status: 400 });
  if (!author_id)  return NextResponse.json({ error: 'author_id is required' }, { status: 400 });

  if (parent_reply_id !== null) {
    const [parent] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM replies WHERE id = ? AND post_id = ?', [parent_reply_id, id]
    );
    if (parent.length === 0) {
      return NextResponse.json({ error: 'Parent reply not found on this post' }, { status: 404 });
    }
  }

  const [result] = await pool.execute<RowDataPacket & { insertId: number }>(
    'INSERT INTO replies (post_id, parent_reply_id, author_id, body) VALUES (?, ?, ?, ?)',
    [id, parent_reply_id, author_id, replyBody]
  );

  return NextResponse.json(
    {
      id: (result as { insertId: number }).insertId,
      post_id: Number(id),
      parent_reply_id,
      author_id,
      body: replyBody,
    },
    { status: 201 }
  );
}
