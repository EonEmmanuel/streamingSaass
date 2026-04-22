# Live Streaming Platform (Node.js + TypeScript + Prisma + Node-Media-Server)

Production-style full-stack streaming platform supporting **vMix RTMP ingest** and **HLS playback**.

## Architecture

`vMix -> RTMP -> Node-Media-Server -> FFmpeg -> HLS -> React Player`

## Apps

- `backend/`: Express API, Prisma (Neon PostgreSQL), JWT auth, RTMP ingest/HLS output.
- `frontend/`: React + Vite + TypeScript + Tailwind modern admin and playback UI.

## Backend endpoints

- `POST /api/auth/login`
- `GET /api/overview`
- `GET /api/streams`
- `POST /api/streams`
- `DELETE /api/streams/:id`
- `PATCH /api/streams/:id`
- `GET /api/live`
- `GET /api/status/:streamKey`

## RTMP + HLS

- Publish: `rtmp://server-ip/live/{streamKey}`
- Play: `http://server-ip:8000/live/{streamKey}/index.m3u8`

## Quick start

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

## vMix settings

- RTMP URL: `rtmp://server-ip/live`
- Stream key: `example123`
- Final publish URL: `rtmp://server-ip/live/example123`

## Notes

- Requires system FFmpeg (`FFMPEG_PATH` in `.env`).
- Use Neon PostgreSQL connection string in `DATABASE_URL`.
- Create an admin user in DB (seed script can be added later).
