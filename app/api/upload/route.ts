import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { initDB, getPool } from '@/lib/db';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_EXT  = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_BYTES    = 5 * 1024 * 1024; // 5 MB

// POST /api/upload
// Body: multipart/form-data with fields:
//   file        — the image file
//   target_type — "post" | "reply"
//   target_id   — ID of the post or reply
export async function POST(req: NextRequest) {
  await initDB();
  const pool = getPool();

  const formData = await req.formData();
  const file        = formData.get('file') as File | null;
  const target_type = (formData.get('target_type') as string | null)?.trim();
  const target_id   = formData.get('target_id');

  if (!file)        return NextResponse.json({ error: 'No file provided' },          { status: 400 });
  if (!target_type) return NextResponse.json({ error: 'target_type is required' },   { status: 400 });
  if (!target_id)   return NextResponse.json({ error: 'target_id is required' },     { status: 400 });
  if (target_type !== 'post' && target_type !== 'reply') {
    return NextResponse.json({ error: 'target_type must be "post" or "reply"' }, { status: 400 });
  }

  // Validate MIME type
  const mime = file.type;
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: 'Only PNG, JPEG, and WebP images are allowed' },
      { status: 400 }
    );
  }

  // Validate extension
  const origExt = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(origExt)) {
    return NextResponse.json(
      { error: 'File extension must be .png, .jpg, .jpeg, or .webp' },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 });
  }

  // Write to disk
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

  const filename  = `${randomUUID()}${origExt}`;
  const diskPath  = path.join(uploadDir, filename);
  const storePath = `/uploads/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);

  // Insert metadata into attachments table
  const [result] = await pool.execute<{ insertId: number } & object>(
    'INSERT INTO attachments (target_type, target_id, mime_type, size_bytes, store_path) VALUES (?, ?, ?, ?, ?)',
    [target_type, Number(target_id), mime, file.size, storePath]
  );

  return NextResponse.json(
    {
      id:          (result as { insertId: number }).insertId,
      target_type,
      target_id:   Number(target_id),
      mime_type:   mime,
      size_bytes:  file.size,
      store_path:  storePath,
    },
    { status: 201 }
  );
}
