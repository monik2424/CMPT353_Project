import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface ChannelRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  creator_name: string;
}

// GET /api/channels — list all channels
export async function GET() {
  await initDB();
  const pool = getPool();

  const [rows] = await pool.execute<ChannelRow[]>(`
    SELECT c.id, c.name, c.description, c.created_by, c.created_at,
           u.display_name AS creator_name
    FROM   channels c
    JOIN   users    u ON u.id = c.created_by
    ORDER BY c.created_at DESC
  `);

  return NextResponse.json(rows);
}

// POST /api/channels — create a channel (auth required)
export async function POST(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await initDB();
  const pool = getPool();

  const body = await req.json();
  const name        = (body.name        ?? '').trim();
  const description = (body.description ?? '').trim() || null;
  const created_by  = user.id;

  if (!name) {
    return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ error: 'Channel name must be 100 characters or fewer' }, { status: 400 });
  }

  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM channels WHERE name = ?', [name]
  );
  if (existing.length > 0) {
    return NextResponse.json({ error: 'A channel with that name already exists' }, { status: 409 });
  }

  const [result] = await pool.execute<RowDataPacket & { insertId: number }>(
    'INSERT INTO channels (name, description, created_by) VALUES (?, ?, ?)',
    [name, description, created_by]
  );

  return NextResponse.json({ id: (result as { insertId: number }).insertId, name, description }, { status: 201 });
}
