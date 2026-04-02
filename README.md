# CMPT 353 — Channel-Based Programming Q&A Tool

## Quick Start (Docker)

```bash
# 1. Clone the repo and enter the project folder
git clone <repo-url>
cd CMPT353_Project

# 2. Copy the environment file
cp .env.example .env

# 3. Build and start all services
docker-compose up --build
```

The app will be available at **http://localhost:3000**

---

## Ports

| Service | Port |
|---------|------|
| Next.js app | http://localhost:3000 |
| MySQL | localhost:3307 (internal hostname: `mysql`) |

---

## Admin Credentials (seed data)

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

These are set via `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.

---

## Database

- **Engine:** MySQL 8
- **Database name:** `qa_db`
- **Schema:** All 6 tables are created automatically via `CREATE TABLE IF NOT EXISTS` on first request (no manual migration step needed)
- **Seed data:** Applied automatically on first request if the `users` table is empty

### Tables

| Table | Description |
|-------|-------------|
| `users` | Accounts with hashed passwords and role |
| `channels` | Named discussion channels |
| `posts` | Questions/messages inside a channel |
| `replies` | Threaded replies to posts (supports nesting via `parent_reply_id`) |
| `votes` | Up/down votes on posts and replies |
| `attachments` | File upload metadata linked to a post or reply |

### Seed data

| Entity | Count | Details |
|--------|-------|---------|
| Users | 3 | `admin` (role=admin), `Alice`, `Bob` |
| Channels | 3 | general, javascript, databases |
| Posts | 4 | spread across channels |
| Replies | 3 | including one nested reply |
| Attachments | 1 | linked to the welcome post |

Seed user passwords:
- `admin` → value of `ADMIN_PASSWORD` in `.env` (default: `admin123`)
- `Alice` / `Bob` → `password123`

### Verify DB is ready

After `docker-compose up --build`, open:

```
http://localhost:3000/api/health
```

Expected response:
```json
{ "status": "ok", "db": "connected", "seed": { "users": 3, "channels": 3, "posts": 4 } }
```

---

## Pages & Routes

### UI Pages

| URL | What it does |
|-----|-------------|
| `http://localhost:3000/` | Landing page |
| `http://localhost:3000/channels` | Browse all channels + create a channel |
| `http://localhost:3000/channels/:id` | Channel detail — list of posts |
| `http://localhost:3000/channels/:id/new-post` | Create a new post (with optional screenshot) |
| `http://localhost:3000/posts/:id` | Post detail — body, replies, nested replies, votes |
| `http://localhost:3000/search` | **Search** — 5 query types with pagination |
| `http://localhost:3000/register` | Create account |
| `http://localhost:3000/login` | Sign in |
| `http://localhost:3000/admin` | Admin panel (admin only) |

### API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/health` | DB connection check + seed counts |
| `GET` | `/api/channels` | List all channels |
| `POST` | `/api/channels` | Create a channel (auth required) |
| `DELETE` | `/api/channels/:id` | Delete a channel (admin only) |
| `GET` | `/api/channels/:id/posts` | List posts in a channel |
| `POST` | `/api/channels/:id/posts` | Create a post (auth required) |
| `GET` | `/api/posts/:id` | Get a single post |
| `DELETE` | `/api/posts/:id` | Delete a post (admin only) |
| `GET` | `/api/posts/:id/replies` | List replies for a post |
| `POST` | `/api/posts/:id/replies` | Add a reply (auth required) |
| `DELETE` | `/api/replies/:id` | Delete a reply (admin only) |
| `GET` | `/api/votes?target_type=&target_id=` | Get vote counts + user's vote |
| `POST` | `/api/votes` | Cast or change a vote (auth required) |
| `DELETE` | `/api/votes?target_type=&target_id=` | Remove a vote (auth required) |
| `GET` | `/api/attachments?target_type=&target_id=` | Get attachments for a post or reply |
| `POST` | `/api/upload` | Upload a screenshot (PNG/JPEG/WebP, max 5 MB, auth required) |
| `GET` | `/api/files/:id` | Serve an uploaded file |
| `GET` | `/api/search?type=&q=&limit=&offset=` | **Search** — see below |
| `GET` | `/api/auth/me` | Current user info |
| `POST` | `/api/auth/register` | Register a new account |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `GET` | `/api/users` | List all users (admin only) |
| `DELETE` | `/api/users/:id` | Delete a user (admin only) |
| `GET` | `/api/admin/posts` | List all posts with author/channel (admin only) |
| `GET` | `/api/admin/replies` | List all replies with author/post (admin only) |

---

## Search — Part 4

### Endpoint

```
GET /api/search?type=<type>&q=<keyword>&limit=10&offset=0
```

### Query types

| `type` | `q` required | Description |
|--------|-------------|-------------|
| `content` | yes | Substring search across **post titles**, **post bodies**, and **reply bodies** (`LIKE %q%`) |
| `by-author` | yes | All posts and replies written by a user with exact `display_name = q` |
| `top-authors` | no | Users ranked by post count **descending** (most prolific first) |
| `bottom-authors` | no | Users ranked by post count **ascending** (least prolific, ≥ 1 post) |
| `top-voted` | no | Posts ranked by **net score** descending |

### Ranking formula

**Net score** = `SUM(votes.value)` where `value = +1` (upvote) or `value = -1` (downvote).
A post with 3 upvotes and 1 downvote has a net score of **+2**.

### Pagination

All results support `limit` (default 10, max 50) and `offset`. The response includes a `hasMore` boolean. The Search UI shows a **"Load more"** button when `hasMore = true`.

### Indexes added for search performance

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_posts_ft` | `posts` | `title, body` | FULLTEXT — keyword search |
| `idx_replies_ft` | `replies` | `body` | FULLTEXT — keyword search |
| `idx_votes_target` | `votes` | `target_type, target_id` | Fast vote aggregation |
| `idx_posts_author` | `posts` | `author_id` | Fast author-based queries |

Indexes are created automatically on container start (silently skipped if already present).

---

## Environment Variables

See `.env.example` for all required variables. Copy it to `.env` before running.

---

## Stopping the App

```bash
docker-compose down          # stop containers
docker-compose down -v       # stop + delete DB volume (fresh start)
```

---

## Tech Stack

- **Frontend/Backend:** Next.js 16 (App Router, TypeScript)
- **Database:** MySQL 8 via `mysql2/promise`
- **Auth:** JWT (`jsonwebtoken`) + `bcrypt` password hashing
- **Styles:** Tailwind CSS 4
- **Infrastructure:** Docker + docker-compose
