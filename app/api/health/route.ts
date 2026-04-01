import { NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface CountRow extends RowDataPacket {
  count: number;
}

export async function GET() {
  await initDB();
  const pool = getPool();

  const [users]    = await pool.execute<CountRow[]>('SELECT COUNT(*) AS count FROM users');
  const [channels] = await pool.execute<CountRow[]>('SELECT COUNT(*) AS count FROM channels');
  const [posts]    = await pool.execute<CountRow[]>('SELECT COUNT(*) AS count FROM posts');

  return NextResponse.json({
    status: 'ok',
    db: 'connected',
    seed: {
      users:    users[0].count,
      channels: channels[0].count,
      posts:    posts[0].count,
    },
  });
}
