import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { initDB, getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface AttachmentRow extends RowDataPacket {
  id: number;
  mime_type: string;
  store_path: string;
}

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/files/[id] — serve an uploaded file via controlled route
export async function GET(_req: NextRequest, { params }: RouteParams) {
  await initDB();
  const pool = getPool();
  const { id } = await params;

  const [rows] = await pool.execute<AttachmentRow[]>(
    'SELECT id, mime_type, store_path FROM attachments WHERE id = ?', [id]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const attachment = rows[0];
  const diskPath   = path.join(process.cwd(), 'public', attachment.store_path);

  if (!existsSync(diskPath)) {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }

  const buffer = await readFile(diskPath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        attachment.mime_type,
      'Content-Disposition': 'inline',
      'Cache-Control':       'public, max-age=31536000',
    },
  });
}
