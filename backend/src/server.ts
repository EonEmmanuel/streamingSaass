import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import authRoutes from './routes/authRoutes.js';
import streamRoutes from './routes/streamRoutes.js';
import { createMediaServer } from './streaming/mediaServer.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'streaming-platform-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api', streamRoutes);

const apiServer = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

const mediaServer = createMediaServer();
mediaServer.run();

const shutdown = async () => {
  apiServer.close();
  mediaServer.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
