import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { SrsApiClient } from './srsService.js';

export class MetricsService {
  private readonly srs: SrsApiClient;
  private timer: NodeJS.Timeout | null = null;

  constructor(srs: SrsApiClient) {
    this.srs = srs;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.collect().catch(err => console.error('MetricsService collect error:', err));
    }, env.METRICS_COLLECTION_INTERVAL_MS);
    console.log(`MetricsService started (interval: ${env.METRICS_COLLECTION_INTERVAL_MS}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async collect(): Promise<void> {
    const streams = await this.srs.getActiveStreams();

    for (const s of streams) {
      if (!s.publish.active) continue;

      try {
        const streamKey = await prisma.streamKey.findUnique({ where: { key: s.name } });
        if (!streamKey) continue;

        const liveStream = await prisma.stream.findFirst({
          where: { streamKeyId: streamKey.id, isLive: true },
          orderBy: { createdAt: 'desc' },
        });
        if (!liveStream) continue;

        await prisma.streamMetrics.create({
          data: {
            streamId: liveStream.id,
            bitrate: s.kbps.recv_30s,
            fps: s.video?.fps ?? 0,
            viewers: s.clients,
            uptime: Math.floor(s.live_ms / 1000),
          },
        });
      } catch (err) {
        console.error(`MetricsService: failed to record metrics for [${s.name}]:`, err);
      }
    }
  }

  async getStreamHistory(
    streamKey: string,
    durationMs: number,
  ): Promise<{ timestamp: Date; bitrate: number; fps: number; viewers: number; uptime: number }[]> {
    try {
      const key = await prisma.streamKey.findUnique({ where: { key: streamKey } });
      if (!key) return [];

      const since = new Date(Date.now() - durationMs);

      const stream = await prisma.stream.findFirst({
        where: { streamKeyId: key.id },
        orderBy: { createdAt: 'desc' },
      });
      if (!stream) return [];

      const metrics = await prisma.streamMetrics.findMany({
        where: { streamId: stream.id, timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
      });

      return metrics.map(m => ({
        timestamp: m.timestamp,
        bitrate: m.bitrate,
        fps: m.fps,
        viewers: m.viewers,
        uptime: m.uptime,
      }));
    } catch (err) {
      console.error(`MetricsService.getStreamHistory failed [${streamKey}]:`, err);
      return [];
    }
  }
}
