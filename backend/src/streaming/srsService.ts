import { env } from '../config/env.js';

export interface SrsStream {
  id: number;
  name: string;
  vhost: string;
  app: string;
  tcUrl: string;
  url: string;
  live_ms: number;
  clients: number;
  frames: number;
  send_bytes: number;
  recv_bytes: number;
  kbps: { recv_30s: number; send_30s: number };
  publish: { active: boolean; cid: string };
  video: { codec: string; profile: string; level: string; width: number; height: number; sar: string; fps: number; avcc: string } | null;
  audio: { codec: string; sample_rate: number; channel: number; profile: string } | null;
}

interface SrsStreamsResponse {
  code: number;
  server: string;
  streams: SrsStream[];
}

interface SrsVersionResponse {
  code: number;
  server: string;
  data: { major: number; minor: number; revision: number; version: string };
}

export class SrsApiClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.SRS_HTTP_API_URL;
  }

  private static isSrsUnavailable(err: unknown): boolean {
    if (err instanceof Error) {
      const code = (err as NodeJS.ErrnoException).code;
      const causeCode = ((err as { cause?: unknown }).cause as NodeJS.ErrnoException | undefined)?.code;
      return code === 'ECONNREFUSED' || causeCode === 'ECONNREFUSED';
    }
    return false;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`SRS API error ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  }

  async getActiveStreams(): Promise<SrsStream[]> {
    try {
      const data = await this.get<SrsStreamsResponse>('/api/v1/streams');
      return data.streams ?? [];
    } catch (err) {
      if (!SrsApiClient.isSrsUnavailable(err)) {
        console.error('SrsApiClient.getActiveStreams failed:', err);
      }
      return [];
    }
  }

  async getStreamStats(streamKey: string): Promise<{ bitrate: number; fps: number; viewers: number; uptime: number } | null> {
    try {
      const streams = await this.getActiveStreams();
      const match = streams.find(s => s.name === streamKey);
      if (!match) return null;
      return {
        bitrate: match.kbps.recv_30s,
        fps: match.video?.fps ?? 0,
        viewers: match.clients,
        uptime: Math.floor(match.live_ms / 1000),
      };
    } catch (err) {
      if (!SrsApiClient.isSrsUnavailable(err)) {
        console.error(`SrsApiClient.getStreamStats failed [${streamKey}]:`, err);
      }
      return null;
    }
  }

  async isStreamLive(streamKey: string): Promise<boolean> {
    const streams = await this.getActiveStreams();
    return streams.some(s => s.name === streamKey && s.publish.active);
  }

  async getSrsVersion(): Promise<string> {
    try {
      const data = await this.get<SrsVersionResponse>('/api/v1/versions');
      return data.data.version;
    } catch (err) {
      if (!SrsApiClient.isSrsUnavailable(err)) {
        console.error('SrsApiClient.getSrsVersion failed:', err);
      }
      return 'unknown';
    }
  }
}
