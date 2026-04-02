import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { initDB, getPool } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface DbUser extends RowDataPacket {
  id: number;
  display_name: string;
  password_hash: string;
  role: 'user' | 'admin';
}

export async function POST(req: NextRequest) {
  await initDB();
  const pool = getPool();

  const { display_name, password } = await req.json();

  if (!display_name || !password) {
    return NextResponse.json({ error: 'Display name and password are required' }, { status: 400 });
  }

  const [rows] = await pool.execute<DbUser[]>(
    'SELECT id, display_name, password_hash, role FROM users WHERE display_name = ?',
    [display_name]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const user  = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = signToken({ id: user.id, display_name: user.display_name, role: user.role });
  const res   = NextResponse.json({ message: 'Login successful', role: user.role });
  res.cookies.set('token', token, { httpOnly: true, path: '/', sameSite: 'lax' });
  return res;
}
