import cors from 'cors';
import express from 'express';
import path from 'path';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import authRoutes from './routes/authRoutes.js';
import streamRoutes from './routes/streamRoutes.js';
import { SrsHookHandler } from './streaming/mediaServer.js';
import { SrsApiClient } from './streaming/srsService.js';
import { StreamWatchdog } from './streaming/streamWatchdog.js';
import { MetricsService } from './streaming/metricsService.js';

const app = express();

app.use(cors());
app.use(express.json());

// Serve HLS/DASH segments with CDN-ready cache headers
app.use(
  '/media',
  express.static(path.join(process.cwd(), 'media'), {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.m3u8') || filePath.endsWith('.mpd')) {
        res.setHeader('Cache-Control', 'no-cache, no-store');
      } else if (filePath.endsWith('.ts') || filePath.endsWith('.m4s')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'streaming-platform-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api', streamRoutes);

// ── SRS client ───────────────────────────────────────────────────────────────

const srsClient = new SrsApiClient();
const watchdog = new StreamWatchdog(srsClient);
const metrics = new MetricsService(srsClient);

// ── SRS HTTP hook routes ──────────────────────────────────────────────────────

const srsHookHandler = new SrsHookHandler();

app.post(
  '/api/srs/on_publish',
  (req, res) => {
    const streamKey = (req.body as { stream: string }).stream;
    watchdog.onPublish(streamKey);
    srsHookHandler.onPublish(req, res).catch(err => console.error(err));
  },
);

app.post(
  '/api/srs/on_unpublish',
  (req, res) => {
    const streamKey = (req.body as { stream: string }).stream;
    watchdog.onUnpublish(streamKey);
    srsHookHandler.onUnpublish(req, res).catch(err => console.error(err));
  },
);

app.post(
  '/api/srs/on_hls',
  (req, res) => { srsHookHandler.onHls(req, res).catch(err => console.error(err)); },
);

// ── Per-stream stats endpoint ─────────────────────────────────────────────────

app.get('/api/streams/:key/stats', async (req, res) => {
  try {
    const stats = await srsClient.getStreamStats(req.params.key);
    if (!stats) {
      res.status(404).json({ error: 'Stream not found or not live' });
      return;
    }
    res.json(stats);
  } catch (err) {
    console.error('GET /api/streams/:key/stats error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/streams/:key/history', async (req, res) => {
  try {
    const durationMs = Number(req.query.durationMs ?? 3_600_000);
    const history = await metrics.getStreamHistory(req.params.key, durationMs);
    res.json(history);
  } catch (err) {
    console.error('GET /api/streams/:key/history error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Startup ───────────────────────────────────────────────────────────────────

const apiServer = app.listen(env.PORT, async () => {
  console.log(`API listening on http://localhost:${env.PORT}`);

  const version = await srsClient.getSrsVersion();
  if (version !== 'unknown') {
    console.log(`SRS version: ${version}`);
  }

  watchdog.start();
  metrics.start();
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

const shutdown = async (): Promise<void> => {
  console.log('Shutting down...');

  watchdog.stop();
  metrics.stop();

  apiServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => { shutdown().catch(console.error); });
process.on('SIGTERM', () => { shutdown().catch(console.error); });
