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
| `http://localhost:3000/posts/:id` | Post detail — body, replies, add reply (with optional screenshot) |

### API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/health` | DB connection check + seed counts |
| `GET` | `/api/channels` | List all channels |
| `POST` | `/api/channels` | Create a channel |
| `GET` | `/api/channels/:id/posts` | List posts in a channel |
| `POST` | `/api/channels/:id/posts` | Create a post |
| `GET` | `/api/posts/:id` | Get a single post |
| `GET` | `/api/posts/:id/replies` | List replies for a post |
| `POST` | `/api/posts/:id/replies` | Add a reply |
| `GET` | `/api/attachments?target_type=&target_id=` | Get attachments for a post or reply |
| `POST` | `/api/upload` | Upload a screenshot (PNG/JPEG/WebP, max 5 MB) |
| `GET` | `/api/files/:id` | Serve an uploaded file |

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
