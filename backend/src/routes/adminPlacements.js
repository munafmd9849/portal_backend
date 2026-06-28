import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getPlacements, patchPlacementCompensation } from '../controllers/placements.js';

const router = express.Router();

router.get('/', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getPlacements);
router.patch(
  '/:applicationId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  patchPlacementCompensation,
);

export default router;
