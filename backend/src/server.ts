import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import authRoutes from "./routes/authRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import { createMediaServer } from "./streaming/mediaServer.js";
import { spawn, ChildProcess } from "child_process";
import { createServer } from "net";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "streaming-platform-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api", streamRoutes);

const apiServer = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

const mediaServer = createMediaServer();
mediaServer.run();

// Track active SRT processes per stream key
const srtIngestProcesses = new Map<string, ChildProcess>();
const srtPlaybackProcesses = new Map<string, ChildProcess>();
const SRT_PLAYBACK_PORT = env.SRT_PORT + 1;

// Start SRT ingest for a specific stream key
export const startSRTIngest = (streamKey: string, port: number = env.SRT_PORT) => {
  if (srtIngestProcesses.has(streamKey)) return;

  const ffmpeg = spawn(env.FFMPEG_PATH, [
    "-i", `srt://0.0.0.0:${port}?mode=listener&transtype=live&latency=3000000&streamid=${streamKey}`,
    "-c", "copy",
    "-f", "flv",
    `rtmp://localhost:${env.RTMP_PORT}/live/${streamKey}`
  ], { stdio: 'inherit' });

  ffmpeg.on('error', (err) => console.error(`SRT Ingest Error [${streamKey}]:`, err));
  ffmpeg.on('exit', async (code) => {
    console.log(`SRT Ingest [${streamKey}] exited with code ${code}`);
    srtIngestProcesses.delete(streamKey);

    // Auto-restart if key is still active in DB
    setTimeout(async () => {
      try {
        const key = await prisma.streamKey.findUnique({ where: { key: streamKey } });
        if (key?.isActive) {
          console.log(`Restarting SRT Ingest for ${streamKey}`);
          startSRTIngest(streamKey, port);
        }
      } catch (err) {
        console.error(`Failed to check stream key for restart [${streamKey}]:`, err);
      }
    }, 2000);
  });

  srtIngestProcesses.set(streamKey, ffmpeg);
  console.log(`SRT Ingest started for stream key: ${streamKey} on port ${port}`);
};

export const startSRTPlayback = (streamKey: string, port: number = SRT_PLAYBACK_PORT) => {
  if (srtPlaybackProcesses.has(streamKey)) return;

  const ffmpeg = spawn(env.FFMPEG_PATH, [
    "-i", `rtmp://localhost:${env.RTMP_PORT}/live/${streamKey}`,
    "-c", "copy",
    "-f", "mpegts",
    `srt://0.0.0.0:${port}?mode=listener&transtype=live&latency=3000000&streamid=${streamKey}&timeout=60000000`
  ], { stdio: 'inherit' });

  ffmpeg.on('error', (err) => console.error(`SRT Playback Error [${streamKey}]:`, err));
  ffmpeg.on('exit', async (code) => {
    console.log(`SRT Playback [${streamKey}] exited with code ${code}`);
    srtPlaybackProcesses.delete(streamKey);

    // Auto restart if stream is still live
    setTimeout(async () => {
      try {
        const key = await prisma.streamKey.findUnique({
          where: { key: streamKey },
          include: { streams: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });
        if (key?.streams[0]?.isLive) {
          console.log(`Restarting SRT Playback for ${streamKey}`);
          startSRTPlayback(streamKey, port);
        }
      } catch (err) {
        console.error(`Failed to check stream status for restart [${streamKey}]:`, err);
      }
    }, 2000);
  });

  srtPlaybackProcesses.set(streamKey, ffmpeg);
  console.log(`SRT Playback started for stream key: ${streamKey} on port ${port}`);
};

// Stop SRT processes for a stream key
export const stopSRTProcesses = (streamKey: string) => {
  srtIngestProcesses.get(streamKey)?.kill();
  srtPlaybackProcesses.get(streamKey)?.kill();
  srtIngestProcesses.delete(streamKey);
  srtPlaybackProcesses.delete(streamKey);
};

// Start SRT ingest for all active stream keys on startup
const initSRT = async () => {
  const activeKeys = await prisma.streamKey.findMany({
    where: { isActive: true }
  });

  for (const key of activeKeys) {
    startSRTIngest(key.key);
  }

  console.log(`SRT Ingest (Listener) ready on port ${env.SRT_PORT}`);
  console.log(`SRT Playback (Listener) ready on port ${SRT_PLAYBACK_PORT}`);
};

initSRT().catch(console.error);

const shutdown = async () => {
  apiServer.close();
  mediaServer.stop();
  srtIngestProcesses.forEach(p => p.kill());
  srtPlaybackProcesses.forEach(p => p.kill());
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);