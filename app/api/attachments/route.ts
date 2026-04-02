import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface AttachmentRow extends RowDataPacket {
  id: number;
  target_type: string;
  target_id: number;
  mime_type: string;
  size_bytes: number;
  store_path: string;
  created_at: string;
}

// GET /api/attachments?target_type=post&target_id=5
export async function GET(req: NextRequest) {
  await initDB();
  const pool = getPool();

  const { searchParams } = new URL(req.url);
  const target_type = searchParams.get('target_type');
  const target_id   = searchParams.get('target_id');

  if (!target_type || !target_id) {
    return NextResponse.json({ error: 'target_type and target_id are required' }, { status: 400 });
  }
  if (target_type !== 'post' && target_type !== 'reply') {
    return NextResponse.json({ error: 'target_type must be "post" or "reply"' }, { status: 400 });
  }

  const [rows] = await pool.execute<AttachmentRow[]>(
    'SELECT * FROM attachments WHERE target_type = ? AND target_id = ? ORDER BY created_at ASC',
    [target_type, Number(target_id)]
  );

  return NextResponse.json(rows);
}
