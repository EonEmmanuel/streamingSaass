import cors from 'cors';
import express from 'express';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
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

// ── SRS client (declared early so startSRTPlayback can reference it) ───────────

const srsClient = new SrsApiClient();
const watchdog = new StreamWatchdog(srsClient);
const metrics = new MetricsService(srsClient);

// ── SRT playback (ffmpeg RTMP → SRT relay for vMix pull) ─────────────────────

const srtPlaybackProcesses = new Map<string, ChildProcess>();
const srtPlaybackPorts = new Map<string, number>();
let nextSrtPort = env.SRT_PLAYBACK_BASE_PORT;

const assignSrtPort = (streamKey: string): number => {
  if (srtPlaybackPorts.has(streamKey)) return srtPlaybackPorts.get(streamKey)!;
  const port = nextSrtPort++;
  srtPlaybackPorts.set(streamKey, port);
  return port;
};

const freeSrtPort = (streamKey: string): void => {
  srtPlaybackPorts.delete(streamKey);
};

export const getSrtPlaybackPort = (streamKey: string): number | undefined => srtPlaybackPorts.get(streamKey);

export const startSRTPlayback = (streamKey: string): void => {
  if (srtPlaybackProcesses.has(streamKey)) return;

  setTimeout(() => {
    if (srtPlaybackProcesses.has(streamKey)) return;

    const port = assignSrtPort(streamKey);

    const ffmpeg = spawn(
      env.FFMPEG_PATH,
      [
        '-i', `rtmp://localhost:${env.RTMP_PORT}/live/${streamKey}`,
        '-c', 'copy',
        '-f', 'mpegts',
        `srt://0.0.0.0:${port}?mode=listener&transtype=live&latency=3000000&streamid=${streamKey}&timeout=60000000`,
      ],
      { stdio: 'inherit' },
    );

    ffmpeg.on('error', err => console.error(`SRT Playback Error [${streamKey}]:`, err));
    ffmpeg.on('exit', async code => {
      console.log(`SRT Playback [${streamKey}] exited with code ${code}`);
      srtPlaybackProcesses.delete(streamKey);

      setTimeout(async () => {
        try {
          const key = await prisma.streamKey.findUnique({
            where: { key: streamKey },
            include: { streams: { orderBy: { createdAt: 'desc' }, take: 1 } },
          });
          if (key?.streams[0]?.isLive) {
            console.log(`Restarting SRT Playback for ${streamKey}`);
            startSRTPlayback(streamKey);
          }
        } catch (err) {
          console.error(`Failed to check stream status for restart [${streamKey}]:`, err);
        }
      }, 2000);
    });

    srtPlaybackProcesses.set(streamKey, ffmpeg);
    console.log(`SRT Playback started for stream key: ${streamKey} on port ${port}`);

    setTimeout(() => {
      let lastIncreaseTime = Date.now();
      const stallCheck = setInterval(async () => {
        const proc = srtPlaybackProcesses.get(streamKey);
        if (!proc) { clearInterval(stallCheck); return; }
        try {
          const stats = await srsClient.getStreamStats(streamKey);
          if (stats && stats.bitrate > 0) {
            lastIncreaseTime = Date.now();
          } else if (Date.now() - lastIncreaseTime >= 60_000) {
            console.warn(`SRT Playback [${streamKey}]: no bytes sent in 60s, killing ffmpeg`);
            clearInterval(stallCheck);
            proc.kill();
          }
        } catch {
          // SRS not reachable; skip this tick
        }
      }, 30_000);
    }, 20_000);

  }, 2000);
};

export const stopSRTProcesses = (streamKey: string): void => {
  srtPlaybackProcesses.get(streamKey)?.kill();
  srtPlaybackProcesses.delete(streamKey);
  freeSrtPort(streamKey);
};

// ── SRS HTTP hook routes ──────────────────────────────────────────────────────

const srsHookHandler = new SrsHookHandler(startSRTPlayback, stopSRTProcesses);

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
    res.json({ ...stats, srtPlaybackPort: getSrtPlaybackPort(req.params.key) ?? null });
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
  console.log(`SRT Playback base port: ${env.SRT_PLAYBACK_BASE_PORT}`);

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

  // Give active streams up to 30s to drain, then force-stop
  const forceStop = setTimeout(() => {
    console.warn('Force-stopping remaining SRT processes after 30s timeout');
    srtPlaybackProcesses.forEach(p => p.kill('SIGKILL'));
    process.exit(1);
  }, 30_000);

  srtPlaybackProcesses.forEach(p => p.kill());

  apiServer.close(async () => {
    clearTimeout(forceStop);
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => { shutdown().catch(console.error); });
process.on('SIGTERM', () => { shutdown().catch(console.error); });
