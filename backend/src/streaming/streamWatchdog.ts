import fs from 'fs';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { SrsApiClient } from './srsService.js';

export class StreamWatchdog {
  private readonly srs: SrsApiClient;
  private timer: NodeJS.Timeout | null = null;
  private diskTimer: NodeJS.Timeout | null = null;
  private streamStartTimes: Map<string, number> = new Map();

  constructor(srs: SrsApiClient) {
    this.srs = srs;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.poll().catch(err => console.error('StreamWatchdog poll error:', err));
    }, env.STREAM_WATCHDOG_INTERVAL_MS);
    this.diskTimer = setInterval(() => { this.checkDiskSpace(); }, 60_000);
    console.log(`StreamWatchdog started (interval: ${env.STREAM_WATCHDOG_INTERVAL_MS}ms)`);
  }

  onPublish(streamKey: string): void {
    this.streamStartTimes.set(streamKey, Date.now());
  }

  onUnpublish(streamKey: string): void {
    this.streamStartTimes.delete(streamKey);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.diskTimer) {
      clearInterval(this.diskTimer);
      this.diskTimer = null;
    }
  }

  private checkDiskSpace(): void {
    try {
      const stats = fs.statfsSync('./media');
      const freeGB = (stats.bfree * stats.bsize) / (1024 ** 3);
      if (freeGB < env.MIN_DISK_GB) {
        console.error(
          `CRITICAL: Low disk space: ${freeGB.toFixed(2)}GB free ` +
          `(threshold: ${env.MIN_DISK_GB}GB)`
        );
      }
    } catch (err) {
      // statfsSync not supported on Windows — skip silently
      // Will work correctly on EC2/Linux
    }
  }

  private static isDbUnavailable(err: unknown): boolean {
    if (err instanceof Error) {
      const code = (err as { code?: string }).code;
      const causeCode = ((err as { cause?: unknown }).cause as { code?: string } | undefined)?.code;
      return code === 'P1001' || causeCode === 'ETIMEDOUT' || causeCode === 'ECONNREFUSED';
    }
    return false;
  }

  private async poll(): Promise<void> {
    let srsStreams: Awaited<ReturnType<SrsApiClient['getActiveStreams']>> = [];
    let dbLiveStreams: { id: string; streamKey: { key: string } }[] = [];

    try {
      srsStreams = await this.srs.getActiveStreams();
    } catch {
      return;
    }

    try {
      dbLiveStreams = await prisma.stream.findMany({
        where: { isLive: true },
        include: { streamKey: true },
      });
    } catch (err) {
      if (!StreamWatchdog.isDbUnavailable(err)) {
        console.error('StreamWatchdog: DB error during poll:', err);
      }
      return;
    }

    const srsActiveKeys = new Set(srsStreams.filter(s => s.publish.active).map(s => s.name));

    // Mark orphaned DB streams offline (isLive=true but not in SRS)
    for (const stream of dbLiveStreams) {
      if (!srsActiveKeys.has(stream.streamKey.key)) {
        try {
          await prisma.stream.update({
            where: { id: stream.id },
            data: { isLive: false, endedAt: new Date() },
          });
          console.warn(`StreamWatchdog: marked orphaned stream offline [${stream.streamKey.key}]`);
        } catch (err) {
          if (!StreamWatchdog.isDbUnavailable(err)) {
            console.error('StreamWatchdog: failed to update stream:', err);
          }
        }
      }
    }

    // Log bitrate warnings for stale/low-bitrate streams
    for (const s of srsStreams) {
      if (s.publish.active && s.kbps.recv_30s < env.MIN_BITRATE_WARNING_KBPS) {
        const startTime = this.streamStartTimes.get(s.name);
        const liveDurationMs = startTime ? Date.now() - startTime : Infinity;
        if (liveDurationMs >= 15000) {
          console.warn(`StreamWatchdog: low bitrate warning [${s.name}] ${s.kbps.recv_30s}kbps`);
        }
      }
    }
  }
}
