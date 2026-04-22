import { Router } from 'express';
import {
  createStreamKey,
  deleteStreamKey,
  getAdminOverview,
  getLiveStreams,
  getStreamStatus,
  getStreams,
  patchStreamKey
} from '../controllers/streamController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/overview', requireAuth, requireAdmin, getAdminOverview);
router.get('/streams', requireAuth, requireAdmin, getStreams);
router.post('/streams', requireAuth, requireAdmin, createStreamKey);
router.delete('/streams/:id', requireAuth, requireAdmin, deleteStreamKey);
router.patch('/streams/:id', requireAuth, requireAdmin, patchStreamKey);
router.get('/live', getLiveStreams);
router.get('/status/:streamKey', getStreamStatus);

export default router;
