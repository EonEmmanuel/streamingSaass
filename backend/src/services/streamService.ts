import { prisma } from '../config/prisma.js';

export const getDashboardStats = async () => {
  const [activeStreams, totalKeys, liveViewers] = await Promise.all([
    prisma.stream.count({ where: { isLive: true } }),
    prisma.streamKey.count(),
    prisma.stream.aggregate({ _sum: { viewerCount: true }, where: { isLive: true } })
  ]);

  return {
    activeStreams,
    totalKeys,
    liveViewers: liveViewers._sum.viewerCount ?? 0
  };
};

export const getOrCreateStreamRecord = async (streamKeyId: string) => {
  const existing = await prisma.stream.findFirst({
    where: { streamKeyId },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) return existing;

  return prisma.stream.create({
    data: { streamKeyId }
  });
};
