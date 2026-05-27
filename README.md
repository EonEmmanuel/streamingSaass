# Live Streaming Platform (Node.js + TypeScript + Prisma + SRS)

Production-style full-stack streaming platform supporting **RTMP / SRT ingest** and **HLS playback**, powered by [SRS (Simple Realtime Server)](https://github.com/ossrs/srs).

---

## Architecture

```
OBS / vMix → RTMP or SRT → SRS → HLS → React Player
                                ↓
                         Node.js API (Express + Prisma)
```

---

## Apps

- `backend/` — Express API, Prisma ORM (Neon PostgreSQL), JWT auth, SRS integration, stream watchdog, metrics collection.
- `frontend/` — React + Vite + TypeScript + Tailwind CSS admin UI with live monitor and stream key management.

---

## Backend Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Admin login, returns JWT |
| `GET` | `/api/overview` | Dashboard stats (live count, viewers, bitrate) |
| `GET` | `/api/streams` | List all stream keys |
| `POST` | `/api/streams` | Create a stream key |
| `DELETE` | `/api/streams/:id` | Delete a stream key |
| `PATCH` | `/api/streams/:id` | Update a stream key |
| `GET` | `/api/live` | Currently live streams |
| `GET` | `/api/status/:streamKey` | Status of a specific stream |
| `GET` | `/health` | Health check |

---

## RTMP + SRT + HLS URLs

- **RTMP publish:** `rtmp://<server-ip>/live/<streamKey>`
- **SRT publish:** `srt://<server-ip>:9000?streamid=live/<streamKey>`
- **HLS playback:** `http://<server-ip>:8000/live/<streamKey>/index.m3u8`

---

## Prerequisites

Install these before starting:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20 LTS | https://nodejs.org |
| npm | bundled with Node | — |
| Git | any | https://git-scm.com |
| ffmpeg | any | https://ffmpeg.org/download.html |
| PostgreSQL client | optional | for manual DB inspection |

> **ffmpeg on Windows:** Extract to `C:\ffmpeg\` so the binary is at `C:\ffmpeg\bin\ffmpeg.exe`.

---

## Local Development Setup (Windows)

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url> streaming_server_main
cd streaming_server_main

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Backend Environment

Create `backend/.env` (copy from `.env.example` and fill in your values):

```env
# API server port
PORT=4000

# Streaming ports (used in URL generation)
RTMP_PORT=1935
HLS_PORT=8000
SRT_PORT=9000

# Neon PostgreSQL connection string
DATABASE_URL='postgresql://neondb_owner:<password>@<host>-pooler.<region>.aws.neon.tech/testserver?sslmode=require&channel_binding=require'

# JWT secret
JWT_SECRET=your-strong-random-secret

# ffmpeg path — Windows local dev
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe

# Domain/IP used to build RTMP/SRT URLs shown in the UI
BASE_DOMAIN=localhost

# SRS API (not needed locally without Docker — handled gracefully)
SRS_HTTP_API_URL=http://localhost:1985
SRS_HOOK_SECRET=your-shared-secret-change-me

# Rate limiting & intervals
MAX_RECONNECTS_PER_MINUTE=5
STREAM_WATCHDOG_INTERVAL_MS=10000
METRICS_COLLECTION_INTERVAL_MS=30000
THUMBNAIL_INTERVAL_MS=30000
MAX_BITRATE_KBPS=8000
MIN_BITRATE_WARNING_KBPS=150
MIN_DISK_GB=2
SRT_PLAYBACK_BASE_PORT=9001
```

> **Neon test DB:** Log in to https://console.neon.tech → create a new project or database named `testserver` → copy the pooled connection string.

### 3. Configure Frontend Environment

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_HLS_BASE_URL=http://localhost:8000/live
```

### 4. Run Prisma Migrations

```bash
cd backend

# Generate the Prisma client
npm run prisma:generate

# Apply all migrations to the test DB
npm run prisma:migrate
```

Expected output:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your schema.
```

### 5. Seed the Admin User

```bash
cd backend
npm run seed:admin
```

Credentials are printed to the console. See `src/scripts.seedAdmin.ts` for details.

### 6. Start the Backend

```bash
cd backend
npm run dev
```

Expected output:
```
API listening on http://localhost:4000
SRT Playback listener ready on port 9001
SRS version: unavailable   ← normal on Windows without Docker
```

### 7. Start the Frontend

Open a **second terminal**:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## ⚠️ Windows Testing Limitation — SRS

**SRS does not run natively on Windows.** Use **Docker Desktop** to run SRS locally for full RTMP/SRT/HLS support.

| Feature | No Docker | With Docker | Production (Linux) |
|---------|-----------|-------------|--------------------|
| API, auth, stream key management | ✅ | ✅ | ✅ |
| Prisma / database | ✅ | ✅ | ✅ |
| Dashboard stats (UI) | ✅ (shows `—` / 0) | ✅ Live data | ✅ Live data |
| Live Monitor bitrate / viewers | ⚠️ Shows `—` | ✅ Live data | ✅ Live data |
| RTMP ingest | ❌ | ✅ port 1935 | ✅ port 1935 |
| SRT ingest | ❌ | ✅ port 9000 | ✅ port 9000 |
| HLS playback | ❌ | ✅ port 8000 | ✅ port 8000 |
| Stream watchdog | ⚠️ Runs, no streams | ✅ Active | ✅ Active |
| Thumbnail generation | ❌ | ✅ | ✅ |

### Option A — Run SRS via Docker Desktop (recommended for full local testing)

1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) and make sure it is running.

2. From the `backend/` directory, start SRS using the provided Docker Compose file:

```bash
cd backend
docker compose up
```

This uses `backend/docker-compose.yml`, which:
- Pulls `ossrs/srs:5`
- Maps ports `1935` (RTMP), `8000` (HLS), `1985` (API), `9000/udp` (SRT), `9001/udp` (SRT playback)
- Mounts `backend/srs.dev.conf` as the SRS config inside the container
- Mounts `backend/media/` for HLS segment storage
- Uses `host.docker.internal` so SRS hooks can reach your local Node.js API on port 4000

3. SRS will be available at:
   - RTMP: `rtmp://localhost/live/<streamKey>`
   - SRT: `srt://localhost:9000?streamid=live/<streamKey>`
   - HLS: `http://localhost:8000/live/<streamKey>/index.m3u8`
   - API: `http://localhost:1985`

4. Your `backend/.env` already points to `SRS_HTTP_API_URL=http://localhost:1985` — no changes needed.

5. Start the backend and frontend as usual (steps 6–7 above). The startup message will now show the SRS version instead of `unavailable`.

### Option B — Without Docker (API/UI testing only)

If you only need to test the API, auth, stream key management, and the admin UI — Docker is not required. Skip the Docker step and run the backend and frontend as described above.

On startup you will see:
```
SRS version: unavailable
```
This is **expected and handled gracefully** — the API catches the connection error and continues. All non-SRS functionality works normally.

---

## Production Setup (Ubuntu / EC2)

### 1. Install SRS

```bash
sudo apt install -y gcc g++ make cmake libssl-dev
git clone https://github.com/ossrs/srs.git
cd srs/trunk
./configure --srt=on --ffmpeg-tool=on
make
sudo make install
# Binary installed at: /usr/local/srs/objs/srs
```

### 2. Deploy SRS Config

```bash
sudo cp backend/srs.conf /usr/local/srs/conf/srs.conf
```

> `srs.conf` configures RTMP (1935), HLS (8000), SRT (9000), and the HTTP API (1985). The hooks point to `http://localhost:4000/api/srs/...` — update if your API runs on a different host.

### 3. Set Production `.env`

```env
PORT=4000
RTMP_PORT=1935
HLS_PORT=8000
SRT_PORT=9000
DATABASE_URL='postgresql://...'
JWT_SECRET=<strong-random-secret>
FFMPEG_PATH=/usr/bin/ffmpeg
BASE_DOMAIN=your-domain.com
SRS_HTTP_API_URL=http://localhost:1985
SRS_HOOK_SECRET=<strong-random-secret>   # must match value expected by your API
MAX_RECONNECTS_PER_MINUTE=5
STREAM_WATCHDOG_INTERVAL_MS=10000
METRICS_COLLECTION_INTERVAL_MS=30000
THUMBNAIL_INTERVAL_MS=30000
MAX_BITRATE_KBPS=8000
MIN_BITRATE_WARNING_KBPS=150
MIN_DISK_GB=2
SRT_PLAYBACK_BASE_PORT=9001
```

### 4. Run Migrations & Seed

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed:admin
```

### 5. Build the Backend

```bash
cd backend
npm run build
```

### 6. Start Everything with PM2

```bash
# From the backend/ directory
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

`ecosystem.config.cjs` starts two processes:
- `streaming-api` — Node.js API (`dist/server.js`) on port 4000
- `srs` — SRS binary (`/usr/local/srs/objs/srs`) with `srs.conf`

### 7. Build & Serve the Frontend

```bash
cd frontend
npm run build
# Serve dist/ via nginx or any static host
```

---

## Quick Reference — All Commands

```bash
# Backend
cd backend
npm install
npm run prisma:generate       # generate Prisma client
npm run prisma:migrate        # create/update all tables in DB
npm run seed:admin            # create admin user
npm run dev                   # start dev server (hot-reload)
npm run build                 # compile TypeScript → dist/
npm start                     # run compiled build

# Frontend
cd frontend
npm install
npm run dev                   # start Vite dev server on :5173
npm run build                 # build for production → dist/

# Docker (local SRS on Windows)
cd backend
docker compose up             # start SRS container
docker compose down           # stop SRS container

# PM2 (production server only)
cd backend
pm2 start ecosystem.config.cjs
pm2 logs
pm2 status
pm2 restart streaming-api
pm2 restart srs
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `prisma:migrate` fails with SSL error | Ensure `?sslmode=require` is in `DATABASE_URL` |
| `prisma:migrate` fails with "relation already exists" | Run `prisma migrate resolve` or reset the test DB |
| `SRS version: unavailable` on startup | Normal without Docker — SRS not running locally |
| Dashboard shows 0 viewers / `—` bitrate | Expected without SRS; works when a stream is live |
| Port 4000 already in use | Change `PORT` in `.env` and `VITE_API_BASE_URL` in `frontend/.env` |
| ffmpeg not found | Verify `FFMPEG_PATH` points to the actual binary |
| CORS errors in browser | Ensure `VITE_API_BASE_URL` matches the port the backend is running on |
| Docker SRS hooks not reaching API | Ensure backend is running; `host.docker.internal` resolves to your host on Docker Desktop |

---

## vMix / OBS Settings

- **RTMP URL:** `rtmp://<server-ip>/live`
- **Stream key:** `<your-stream-key>`
- **SRT URL:** `srt://<server-ip>:9000?streamid=live/<your-stream-key>`
