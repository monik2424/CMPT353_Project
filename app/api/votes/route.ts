import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface VoteCountRow extends RowDataPacket {
  up:   number;
  down: number;
}

interface UserVoteRow extends RowDataPacket {
  value: number;
}

// GET /api/votes?target_type=post&target_id=5
// Returns { up, down, net, user_vote } — user_vote is 1, -1, or 0 (not voted)
export async function GET(req: NextRequest) {
  await initDB();
  const pool = getPool();

  const { searchParams } = new URL(req.url);
  const target_type = searchParams.get('target_type');
  const target_id   = searchParams.get('target_id');

  if (!target_type || !target_id) {
    return NextResponse.json({ error: 'target_type and target_id are required' }, { status: 400 });
  }

  const [counts] = await pool.execute<VoteCountRow[]>(`
    SELECT
      SUM(value =  1) AS up,
      SUM(value = -1) AS down
    FROM votes
    WHERE target_type = ? AND target_id = ?
  `, [target_type, Number(target_id)]);

  const up   = Number(counts[0].up   ?? 0);
  const down = Number(counts[0].down ?? 0);

  // Check current user's vote if logged in
  let user_vote = 0;
  const user = getCurrentUser(req);
  if (user) {
    const [rows] = await pool.execute<UserVoteRow[]>(
      'SELECT value FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [user.id, target_type, Number(target_id)]
    );
    if (rows.length > 0) user_vote = rows[0].value;
  }

  return NextResponse.json({ up, down, net: up - down, user_vote });
}

// POST /api/votes — cast or change a vote (auth required)
// Body: { target_type, target_id, value: 1 | -1 }
export async function POST(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await initDB();
  const pool = getPool();

  const body        = await req.json();
  const target_type = body.target_type;
  const target_id   = Number(body.target_id);
  const value       = Number(body.value);

  if (target_type !== 'post' && target_type !== 'reply') {
    return NextResponse.json({ error: 'target_type must be "post" or "reply"' }, { status: 400 });
  }
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: 'value must be 1 or -1' }, { status: 400 });
  }
  if (!target_id) {
    return NextResponse.json({ error: 'target_id is required' }, { status: 400 });
  }

  // Upsert — insert or update if user already voted on this target
  await pool.execute(
    `INSERT INTO votes (user_id, target_type, target_id, value)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [user.id, target_type, target_id, value]
  );

  return NextResponse.json({ message: 'Vote recorded', value });
}

// DELETE /api/votes — remove vote (go neutral, auth required)
// Body: { target_type, target_id }
export async function DELETE(req: NextRequest) {
  const user = getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  await initDB();
  const pool = getPool();

  const body        = await req.json();
  const target_type = body.target_type;
  const target_id   = Number(body.target_id);

  if (!target_type || !target_id) {
    return NextResponse.json({ error: 'target_type and target_id are required' }, { status: 400 });
  }

  await pool.execute(
    'DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
    [user.id, target_type, target_id]
  );

  return NextResponse.json({ message: 'Vote removed' });
}
