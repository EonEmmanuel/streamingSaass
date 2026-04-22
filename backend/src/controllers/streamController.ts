import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { getDashboardStats } from '../services/streamService.js';

const createKeySchema = z.object({
  key: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1)
});

const patchStreamSchema = z.object({
  isActive: z.boolean()
});

export const getStreams = async (_req: Request, res: Response): Promise<void> => {
  const streams = await prisma.streamKey.findMany({
    include: {
      streams: { orderBy: { createdAt: 'desc' }, take: 1 },
      user: { select: { username: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const mapped = streams.map((stream) => ({
    id: stream.id,
    key: stream.key,
    name: stream.name,
    isActive: stream.isActive,
    createdAt: stream.createdAt,
    username: stream.user.username,
    latestStatus: stream.streams[0]?.isLive ?? false,
    rtmpUrl: `rtmp://${env.BASE_DOMAIN}/live/${stream.key}`,
    hlsUrl: `http://${env.BASE_DOMAIN}:${env.HLS_PORT}/live/${stream.key}/index.m3u8`
  }));

  res.status(StatusCodes.OK).json(mapped);
};

export const createStreamKey = async (req: Request, res: Response): Promise<void> => {
  const parsed = createKeySchema.safeParse(req.body);
  if (!parsed.success || !req.user) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid request body' });
    return;
  }

  const created = await prisma.streamKey.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      userId: req.user.id
    }
  });

  res.status(StatusCodes.CREATED).json(created);
};

export const deleteStreamKey = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await prisma.streamKey.delete({ where: { id } });
  res.status(StatusCodes.NO_CONTENT).send();
};

export const patchStreamKey = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const parsed = patchStreamSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid request body' });
    return;
  }

  const updated = await prisma.streamKey.update({
    where: { id },
    data: { isActive: parsed.data.isActive }
  });

  res.status(StatusCodes.OK).json(updated);
};

export const getLiveStreams = async (_req: Request, res: Response): Promise<void> => {
  const live = await prisma.stream.findMany({
    where: { isLive: true },
    include: { streamKey: true },
    orderBy: { startedAt: 'desc' }
  });

  res.status(StatusCodes.OK).json(
    live.map((stream) => ({
      id: stream.id,
      key: stream.streamKey.key,
      name: stream.streamKey.name,
      startedAt: stream.startedAt,
      viewerCount: stream.viewerCount,
      hlsUrl: `http://${env.BASE_DOMAIN}:${env.HLS_PORT}/live/${stream.streamKey.key}/index.m3u8`
    }))
  );
};

export const getStreamStatus = async (req: Request, res: Response): Promise<void> => {
  const { streamKey } = req.params;
  const found = await prisma.streamKey.findUnique({
    where: { key: streamKey },
    include: { streams: { orderBy: { createdAt: 'desc' }, take: 1 } }
  });

  if (!found) {
    res.status(StatusCodes.NOT_FOUND).json({ message: 'Stream key not found' });
    return;
  }

  res.status(StatusCodes.OK).json({
    streamKey,
    isActive: found.isActive,
    isLive: found.streams[0]?.isLive ?? false,
    hlsUrl: `http://${env.BASE_DOMAIN}:${env.HLS_PORT}/live/${streamKey}/index.m3u8`
  });
};

export const getAdminOverview = async (_req: Request, res: Response): Promise<void> => {
  const stats = await getDashboardStats();
  res.status(StatusCodes.OK).json(stats);
};
