import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getCalendarEvents } from '../controllers/placementCalendar.js';

const router = express.Router();

router.get(
  '/events',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']),
  getCalendarEvents,
);

export default router;
