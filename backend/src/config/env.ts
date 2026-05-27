import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  RTMP_PORT: z.coerce.number().default(1935),
  SRT_PORT: z.coerce.number().default(9000),
  HLS_PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  FFMPEG_PATH: z.string().min(1),
  BASE_DOMAIN: z.string().default('localhost'),
  SRS_HTTP_API_URL: z.string().url().default('http://localhost:1985'),
  SRS_HOOK_SECRET: z.string().min(1),
  MAX_RECONNECTS_PER_MINUTE: z.coerce.number().default(5),
  STREAM_WATCHDOG_INTERVAL_MS: z.coerce.number().default(10000),
  METRICS_COLLECTION_INTERVAL_MS: z.coerce.number().default(30000),
  THUMBNAIL_INTERVAL_MS: z.coerce.number().default(30000),
  MAX_BITRATE_KBPS: z.coerce.number().default(8000),
  MIN_BITRATE_WARNING_KBPS: z.coerce.number().default(500),
  MIN_DISK_GB: z.coerce.number().default(2),
  SRT_PLAYBACK_BASE_PORT: z.coerce.number().default(9001),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid env configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
