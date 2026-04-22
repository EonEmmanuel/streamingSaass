import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  RTMP_PORT: z.coerce.number().default(1935),
  HLS_PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  FFMPEG_PATH: z.string().min(1),
  BASE_DOMAIN: z.string().default('localhost')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid env configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
