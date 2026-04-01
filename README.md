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
- Schema and tables are created automatically on first boot via `lib/db.ts`
- Seed data is applied by running: *(seed script coming in Step 2)*

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
