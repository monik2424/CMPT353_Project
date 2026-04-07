import bcrypt from 'bcrypt';
import mysql, { OkPacket, RowDataPacket } from 'mysql2/promise';

interface CountRow extends RowDataPacket {
  count: number;
}

export async function seedDB(pool: mysql.Pool) {
  const [rows] = await pool.execute<CountRow[]>('SELECT COUNT(*) AS count FROM users');
  if (rows[0].count > 0) return;

  console.log('Seeding database...');

  const adminName = process.env.ADMIN_USERNAME ?? 'admin';
  const adminPass = process.env.ADMIN_PASSWORD ?? 'admin123';
  const adminHash = await bcrypt.hash(adminPass, 10);
  const userHash  = await bcrypt.hash('password123', 10);

  // --- Users ---
  const [adminRow] = await pool.execute<OkPacket>(
    'INSERT INTO users (display_name, password_hash, role) VALUES (?, ?, ?)',
    [adminName, adminHash, 'admin']
  );
  const adminId = adminRow.insertId;

  const [aliceRow] = await pool.execute<OkPacket>(
    'INSERT INTO users (display_name, password_hash, role) VALUES (?, ?, ?)',
    ['Alice', userHash, 'user']
  );
  const aliceId = aliceRow.insertId;

  const [bobRow] = await pool.execute<OkPacket>(
    'INSERT INTO users (display_name, password_hash, role) VALUES (?, ?, ?)',
    ['Bob', userHash, 'user']
  );
  const bobId = bobRow.insertId;

  // --- Channels ---
  const [ch1] = await pool.execute<OkPacket>(
    'INSERT INTO channels (name, description, created_by) VALUES (?, ?, ?)',
    ['general', 'General programming discussion', adminId]
  );
  const [ch2] = await pool.execute<OkPacket>(
    'INSERT INTO channels (name, description, created_by) VALUES (?, ?, ?)',
    ['javascript', 'JavaScript and TypeScript questions', aliceId]
  );
  const [ch3] = await pool.execute<OkPacket>(
    'INSERT INTO channels (name, description, created_by) VALUES (?, ?, ?)',
    ['databases', 'SQL, NoSQL, and everything data', bobId]
  );

  // --- Posts ---
  const [p1] = await pool.execute<OkPacket>(
    'INSERT INTO posts (channel_id, author_id, title, body) VALUES (?, ?, ?, ?)',
    [
      ch1.insertId, adminId,
      'Welcome to the Q&A Tool!',
      'This is the general channel for all programming discussion. Feel free to ask anything here.',
    ]
  );
  const [p2] = await pool.execute<OkPacket>(
    'INSERT INTO posts (channel_id, author_id, title, body) VALUES (?, ?, ?, ?)',
    [
      ch2.insertId, bobId,
      'How does async/await work in JavaScript?',
      "I keep seeing async/await everywhere but I'm confused about how it differs from plain Promises. Can someone explain?",
    ]
  );
  const [p3] = await pool.execute<OkPacket>(
    'INSERT INTO posts (channel_id, author_id, title, body) VALUES (?, ?, ?, ?)',
    [
      ch2.insertId, aliceId,
      'Best way to handle errors in fetch()',
      "Should I use try/catch with async/await or .catch() with Promises? What's the idiomatic approach?",
    ]
  );
  const [p4] = await pool.execute<OkPacket>(
    'INSERT INTO posts (channel_id, author_id, title, body) VALUES (?, ?, ?, ?)',
    [
      ch3.insertId, aliceId,
      'When should I use NoSQL over SQL?',
      'Working on a new project and trying to decide between MySQL and MongoDB. What are the key trade-offs?',
    ]
  );

  // --- Replies ---
  const [r1] = await pool.execute<OkPacket>(
    'INSERT INTO replies (post_id, parent_reply_id, author_id, body) VALUES (?, ?, ?, ?)',
    [
      p2.insertId, null, adminId,
      'async/await is syntactic sugar over Promises. It makes async code look synchronous, which is easier to read and debug.',
    ]
  );
  await pool.execute(
    'INSERT INTO replies (post_id, parent_reply_id, author_id, body) VALUES (?, ?, ?, ?)',
    [
      p2.insertId, r1.insertId, aliceId,
      'Exactly — and you can still use .then()/.catch() alongside it if needed.',
    ]
  );
  await pool.execute(
    'INSERT INTO replies (post_id, parent_reply_id, author_id, body) VALUES (?, ?, ?, ?)',
    [
      p4.insertId, null, bobId,
      'Use SQL when your data is relational and consistency matters. NoSQL is great for flexible schemas and horizontal scaling.',
    ]
  );

  console.log(`Seed complete — users: 3 (admin="${adminName}", alice, bob), channels: 3, posts: 4, replies: 3`);
  console.log('Seed user passwords: admin → $ADMIN_PASSWORD from .env  |  alice & bob → password123');
}
