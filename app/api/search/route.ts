import { NextRequest, NextResponse } from 'next/server';
import { initDB, getPool } from '@/lib/db';

/**
 * GET /api/search
 *
 * Query params:
 *   type    : 'content' | 'by-author' | 'top-authors' | 'bottom-authors' | 'top-voted'
 *   q       : keyword / author name (required for 'content' and 'by-author')
 *   limit   : number of results per page  (default 10, max 50)
 *   offset  : pagination offset           (default 0)
 *
 * Indexes used:
 *   FULLTEXT idx_posts_ft   on posts(title, body)
 *   FULLTEXT idx_replies_ft on replies(body)
 *   INDEX    idx_votes_target on votes(target_type, target_id)
 *   INDEX    idx_posts_author on posts(author_id)
 *
 * Net score ranking formula: SUM(value)  where value = +1 (up) or -1 (down)
 */

export async function GET(req: NextRequest) {
  try {
    await initDB();
    const pool = getPool();

    const { searchParams } = req.nextUrl;
    const type   = searchParams.get('type') ?? 'content';
    const q      = searchParams.get('q') ?? '';
    const limit  = Math.min(Math.max(parseInt(searchParams.get('limit')  ?? '10'), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

    // ── 1. Keyword search across post titles, post bodies, and reply bodies ──
    if (type === 'content') {
      if (!q.trim()) return NextResponse.json({ error: 'q is required' }, { status: 400 });
      const like = `%${q}%`;

      const [postRows] = await pool.execute<any[]>(`
        SELECT
          'post'               AS result_type,
          p.id                 AS id,
          p.title              AS title,
          SUBSTRING(p.body, 1, 200) AS excerpt,
          u.display_name       AS author_name,
          c.name               AS channel_name,
          p.id                 AS post_id,
          p.created_at
        FROM posts p
        JOIN users    u ON u.id = p.author_id
        JOIN channels c ON c.id = p.channel_id
        WHERE p.title LIKE ? OR p.body LIKE ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [like, like, limit, offset]);

      const [replyRows] = await pool.execute<any[]>(`
        SELECT
          'reply'              AS result_type,
          r.id                 AS id,
          NULL                 AS title,
          SUBSTRING(r.body, 1, 200) AS excerpt,
          u.display_name       AS author_name,
          c.name               AS channel_name,
          r.post_id            AS post_id,
          p.title              AS post_title,
          r.created_at
        FROM replies r
        JOIN users    u ON u.id = r.author_id
        JOIN posts    p ON p.id = r.post_id
        JOIN channels c ON c.id = p.channel_id
        WHERE r.body LIKE ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [like, limit, offset]);

      const results = [...postRows, ...replyRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, limit);

      return NextResponse.json({ results, hasMore: results.length === limit });
    }

    // ── 2. Content by a specific author ──
    if (type === 'by-author') {
      if (!q.trim()) return NextResponse.json({ error: 'q is required' }, { status: 400 });

      const [postRows] = await pool.execute<any[]>(`
        SELECT
          'post'               AS result_type,
          p.id                 AS id,
          p.title              AS title,
          SUBSTRING(p.body, 1, 200) AS excerpt,
          u.display_name       AS author_name,
          c.name               AS channel_name,
          p.id                 AS post_id,
          p.created_at
        FROM posts p
        JOIN users    u ON u.id = p.author_id
        JOIN channels c ON c.id = p.channel_id
        WHERE u.display_name = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [q, limit, offset]);

      const [replyRows] = await pool.execute<any[]>(`
        SELECT
          'reply'              AS result_type,
          r.id                 AS id,
          NULL                 AS title,
          SUBSTRING(r.body, 1, 200) AS excerpt,
          u.display_name       AS author_name,
          c.name               AS channel_name,
          r.post_id            AS post_id,
          p.title              AS post_title,
          r.created_at
        FROM replies r
        JOIN users    u ON u.id = r.author_id
        JOIN posts    p ON p.id = r.post_id
        JOIN channels c ON c.id = p.channel_id
        WHERE u.display_name = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [q, limit, offset]);

      const results = [...postRows, ...replyRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, limit);

      return NextResponse.json({ results, hasMore: results.length === limit });
    }

    // ── 3. Top authors — users with most posts (DESC) ──
    if (type === 'top-authors') {
      const [rows] = await pool.execute<any[]>(`
        SELECT
          'user'           AS result_type,
          u.id             AS id,
          u.display_name   AS author_name,
          COUNT(p.id)      AS post_count
        FROM users u
        LEFT JOIN posts p ON p.author_id = u.id
        GROUP BY u.id
        ORDER BY post_count DESC, u.display_name ASC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      return NextResponse.json({ results: rows, hasMore: rows.length === limit });
    }

    // ── 4. Bottom authors — users with fewest posts (ASC), at least 1 ──
    if (type === 'bottom-authors') {
      const [rows] = await pool.execute<any[]>(`
        SELECT
          'user'           AS result_type,
          u.id             AS id,
          u.display_name   AS author_name,
          COUNT(p.id)      AS post_count
        FROM users u
        INNER JOIN posts p ON p.author_id = u.id
        GROUP BY u.id
        ORDER BY post_count ASC, u.display_name ASC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      return NextResponse.json({ results: rows, hasMore: rows.length === limit });
    }

    // ── 5. Top-voted content — posts ranked by net score = SUM(value) ──
    if (type === 'top-voted') {
      const [rows] = await pool.execute<any[]>(`
        SELECT
          'post'                        AS result_type,
          p.id                          AS id,
          p.title                       AS title,
          SUBSTRING(p.body, 1, 200)     AS excerpt,
          u.display_name                AS author_name,
          c.name                        AS channel_name,
          p.id                          AS post_id,
          COALESCE(SUM(v.value), 0)     AS net_score,
          p.created_at
        FROM posts p
        JOIN users    u ON u.id = p.author_id
        JOIN channels c ON c.id = p.channel_id
        LEFT JOIN votes v ON v.target_type = 'post' AND v.target_id = p.id
        GROUP BY p.id, p.title, p.body, u.display_name, c.name, p.created_at
        ORDER BY net_score DESC, p.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      return NextResponse.json({ results: rows, hasMore: rows.length === limit });
    }

    return NextResponse.json({ error: 'Unknown search type' }, { status: 400 });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
