import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { getOrCreateStreamRecord } from "../services/streamService.js";
import { spawn } from "child_process";

// Per-stream reconnect rate limiting: timestamps of recent connect attempts
const reconnectTimestamps = new Map<string, number[]>();

// Active thumbnail snapshot jobs per stream key
const thumbnailJobs = new Map<string, NodeJS.Timeout>();

const checkReconnectLimit = (streamKey: string): boolean => {
  const now = Date.now();
  const window = 60_000;
  const timestamps = (reconnectTimestamps.get(streamKey) ?? []).filter(
    (t) => now - t < window,
  );
  timestamps.push(now);
  reconnectTimestamps.set(streamKey, timestamps);
  return timestamps.length <= env.MAX_RECONNECTS_PER_MINUTE;
};

const startThumbnailJob = (streamKey: string): void => {
  if (thumbnailJobs.has(streamKey)) return;

  const hlsUrl = `http://localhost:${env.HLS_PORT}/live/${streamKey}/index.m3u8`;
  const outDir = path.join(process.cwd(), "media", "thumbnails", streamKey);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "latest.jpg");

  const capture = () => {
    const ff = spawn(
      env.FFMPEG_PATH,
      ["-i", hlsUrl, "-vframes", "1", "-q:v", "2", "-y", outPath],
      { stdio: "ignore" },
    );
    ff.on("error", (err) =>
      console.error(`Thumbnail capture error [${streamKey}]:`, err),
    );
  };

  capture();
  const timer = setInterval(capture, env.THUMBNAIL_INTERVAL_MS);
  thumbnailJobs.set(streamKey, timer);
};

const stopThumbnailJob = (streamKey: string): void => {
  const timer = thumbnailJobs.get(streamKey);
  if (timer) {
    clearInterval(timer);
    thumbnailJobs.delete(streamKey);
  }
};

export const verifyHmacSignature = (
  req: Request,
  res: Response,
  next: () => void,
): void => {
  const signature = req.headers["x-srs-signature"] as string | undefined;
  if (!signature) {
    res.status(401).json({ code: 1, error: "Missing signature" });
    return;
  }

  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", env.SRS_HOOK_SECRET)
    .update(body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    res.status(401).json({ code: 1, error: "Invalid signature" });
    return;
  }

  next();
};

export class SrsHookHandler {
  async onPublish(req: Request, res: Response): Promise<void> {
    const { stream } = req.body as {
      stream: string;
      app: string;
      tcUrl: string;
    };
    const streamKey = stream;

    try {
      if (!checkReconnectLimit(streamKey)) {
        console.warn(`on_publish: rate limit exceeded for [${streamKey}]`);
        res.json({ code: 1, error: "Rate limit exceeded" });
        return;
      }

      const key = await prisma.streamKey.findUnique({
        where: { key: streamKey },
      });
      if (!key || !key.isActive) {
        console.warn(
          `on_publish: rejected unknown/inactive key [${streamKey}]`,
        );
        res.json({ code: 1, error: "Unauthorized stream key" });
        return;
      }

      startThumbnailJob(streamKey);

      const record = await getOrCreateStreamRecord(key.id);
      await prisma.stream.update({
        where: { id: record.id },
        data: { isLive: true, startedAt: new Date(), endedAt: null },
      });

      console.log(`on_publish: stream started [${streamKey}]`);
      res.json({ code: 0 });
    } catch (err) {
      console.error(`on_publish error [${streamKey}]:`, err);
      res.json({ code: 1, error: "Internal error" });
    }
  }

  async onUnpublish(req: Request, res: Response): Promise<void> {
    const { stream } = req.body as { stream: string };
    const streamKey = stream;

    try {
      stopThumbnailJob(streamKey);

      const streamDir = path.join(process.cwd(), "media", "live", streamKey);
      if (fs.existsSync(streamDir)) {
        setTimeout(() => {
          try {
            fs.rmSync(streamDir, { recursive: true, force: true });
            console.log(`Cleaned up HLS directory for: ${streamKey}`);
          } catch (err) {
            console.error(
              `Failed to cleanup HLS directory for ${streamKey}:`,
              err,
            );
          }
        }, 5000);
      }

      const key = await prisma.streamKey.findUnique({
        where: { key: streamKey },
      });
      if (key) {
        const latest = await prisma.stream.findFirst({
          where: { streamKeyId: key.id },
          orderBy: { createdAt: "desc" },
        });
        if (latest) {
          await prisma.stream.update({
            where: { id: latest.id },
            data: { isLive: false, endedAt: new Date() },
          });
        }
      }

      console.log(`on_unpublish: stream ended [${streamKey}]`);
      res.json({ code: 0 });
    } catch (err) {
      console.error(`on_unpublish error [${streamKey}]:`, err);
      res.json({ code: 1, error: "Internal error" });
    }
  }

  async onHls(req: Request, res: Response): Promise<void> {
    // SRS notifies on each HLS segment write; acknowledge without action
    res.json({ code: 0 });
  }
}
