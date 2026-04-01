import mysql from 'mysql2/promise';
import { seedDB } from './seed';

let pool: mysql.Pool;

export async function initDB() {
  if (pool) return;

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      display_name VARCHAR(100)              NOT NULL,
      password_hash VARCHAR(255)             NOT NULL,
      role         ENUM('user', 'admin')     NOT NULL DEFAULT 'user',
      created_at   TIMESTAMP                 NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS channels (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(100)  NOT NULL UNIQUE,
      description TEXT,
      created_by  INT           NOT NULL,
      created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS posts (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      channel_id INT           NOT NULL,
      author_id  INT           NOT NULL,
      title      VARCHAR(255)  NOT NULL,
      body       TEXT          NOT NULL,
      created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id)  REFERENCES users(id)    ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS replies (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      post_id         INT       NOT NULL,
      parent_reply_id INT       DEFAULT NULL,
      author_id       INT       NOT NULL,
      body            TEXT      NOT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id)         REFERENCES posts(id)   ON DELETE CASCADE,
      FOREIGN KEY (parent_reply_id) REFERENCES replies(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id)       REFERENCES users(id)   ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS votes (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT                      NOT NULL,
      target_type ENUM('post', 'reply')    NOT NULL,
      target_id   INT                      NOT NULL,
      value       TINYINT                  NOT NULL,
      created_at  TIMESTAMP                NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_vote (user_id, target_type, target_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS attachments (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      target_type ENUM('post', 'reply') NOT NULL,
      target_id   INT                   NOT NULL,
      mime_type   VARCHAR(100)          NOT NULL,
      size_bytes  INT                   NOT NULL,
      store_path  VARCHAR(500)          NOT NULL,
      created_at  TIMESTAMP             NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('DB tables ensured');
  await seedDB(pool);
}

export function getPool(): mysql.Pool {
  if (!pool) throw new Error('Database not initialized. Call initDB first.');
  return pool;
}
