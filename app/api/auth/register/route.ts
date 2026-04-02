import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { initDB, getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface ExistingUser extends RowDataPacket {
  id: number;
}

export async function POST(req: NextRequest) {
  await initDB();
  const pool = getPool();

  const body         = await req.json();
  const display_name = (body.display_name ?? '').trim();
  const password     = body.password ?? '';

  if (!display_name) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
  }
  if (display_name.length < 2 || display_name.length > 100) {
    return NextResponse.json({ error: 'Display name must be 2–100 characters' }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }
  if (display_name.toLowerCase() === (process.env.ADMIN_USERNAME ?? 'admin').toLowerCase()) {
    return NextResponse.json({ error: 'That display name is reserved' }, { status: 400 });
  }

  const [existing] = await pool.execute<ExistingUser[]>(
    'SELECT id FROM users WHERE display_name = ?', [display_name]
  );
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Display name already taken' }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  await pool.execute(
    'INSERT INTO users (display_name, password_hash, role) VALUES (?, ?, ?)',
    [display_name, password_hash, 'user']
  );

  return NextResponse.json({ message: 'Registration successful' }, { status: 201 });
}
