import NodeMediaServer from 'node-media-server';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { getOrCreateStreamRecord } from '../services/streamService.js';

const getStreamKeyFromPath = (streamPath: string): string => {
  const parts = streamPath.split('/').filter(Boolean);
  return parts[1] ?? '';
};

export const createMediaServer = (): NodeMediaServer => {
  const config = {
    logType: 2,
    rtmp: {
      port: env.RTMP_PORT,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60
    },
    http: {
      port: env.HLS_PORT,
      mediaroot: './media',
      allow_origin: '*'
    },
    trans: {
      ffmpeg: env.FFMPEG_PATH,
      tasks: [
        {
          app: 'live',
          hls: true,
          hlsFlags: '[hls_time=2:hls_list_size=5:hls_flags=delete_segments]'
        }
      ]
    }
  };

  const nms = new NodeMediaServer(config);

  nms.on('prePublish', async (id: string, streamPath: string) => {
    const streamKey = getStreamKeyFromPath(streamPath);
    const session = nms.getSession(id);

    const key = await prisma.streamKey.findUnique({ where: { key: streamKey } });
    if (!key || !key.isActive) {
      session.reject();
      return;
    }
  });

  nms.on('postPublish', async (_id: string, streamPath: string) => {
    const streamKey = getStreamKeyFromPath(streamPath);
    const key = await prisma.streamKey.findUnique({ where: { key: streamKey } });
    if (!key) return;

    const record = await getOrCreateStreamRecord(key.id);
    await prisma.stream.update({
      where: { id: record.id },
      data: { isLive: true, startedAt: new Date(), endedAt: null }
    });
  });

  nms.on('donePublish', async (_id: string, streamPath: string) => {
    const streamKey = getStreamKeyFromPath(streamPath);
    
    // Cleanup HLS files
    const streamDir = path.join(process.cwd(), 'media', 'live', streamKey);
    if (fs.existsSync(streamDir)) {
      try {
        // Wait a bit to ensure files are no longer in use
        setTimeout(() => {
          fs.rmSync(streamDir, { recursive: true, force: true });
          console.log(`Cleaned up HLS directory for: ${streamKey}`);
        }, 5000);
      } catch (err) {
        console.error(`Failed to cleanup HLS directory for ${streamKey}:`, err);
      }
    }

    const key = await prisma.streamKey.findUnique({ where: { key: streamKey } });
    if (!key) return;

    const latest = await prisma.stream.findFirst({
      where: { streamKeyId: key.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!latest) return;

    await prisma.stream.update({
      where: { id: latest.id },
      data: { isLive: false, endedAt: new Date() }
    });
  });

  return nms;
};
