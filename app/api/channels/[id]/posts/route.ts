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

interface ChannelRow extends RowDataPacket {
  id: number;
}

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/channels/[id]/posts — list posts in a channel
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await initDB();
  const pool = getPool();
  const { id } = await params;

  const [channel] = await pool.execute<ChannelRow[]>(
    'SELECT id FROM channels WHERE id = ?', [id]
  );
  if (channel.length === 0) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  const [rows] = await pool.execute<PostRow[]>(`
    SELECT p.id, p.channel_id, p.author_id, p.title, p.body, p.created_at,
           u.display_name AS author_name
    FROM   posts p
    JOIN   users u ON u.id = p.author_id
    WHERE  p.channel_id = ?
    ORDER BY p.created_at DESC
  `, [id]);

  return NextResponse.json(rows);
}

// POST /api/channels/[id]/posts — create a post in a channel (auth required)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await initDB();
  const pool = getPool();
  const { id } = await params;

  const [channel] = await pool.execute<ChannelRow[]>(
    'SELECT id FROM channels WHERE id = ?', [id]
  );
  if (channel.length === 0) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  const body      = await req.json();
  const title     = (body.title ?? '').trim();
  const postBody  = (body.body  ?? '').trim();
  const author_id = user.id;

  if (!title)    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!postBody) return NextResponse.json({ error: 'Body is required' },  { status: 400 });
  if (title.length > 255) {
    return NextResponse.json({ error: 'Title must be 255 characters or fewer' }, { status: 400 });
  }

  const [result] = await pool.execute<RowDataPacket & { insertId: number }>(
    'INSERT INTO posts (channel_id, author_id, title, body) VALUES (?, ?, ?, ?)',
    [id, author_id, title, postBody]
  );

  return NextResponse.json(
    { id: (result as { insertId: number }).insertId, channel_id: Number(id), author_id, title, body: postBody },
    { status: 201 }
  );
}
