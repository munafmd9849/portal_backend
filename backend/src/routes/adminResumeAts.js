import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { listResumeAts, scoreOne, scoreBatch } from '../controllers/adminResumeAts.js';

const router = express.Router();
const roles = ['ADMIN', 'SUPER_ADMIN'];

router.get('/', authenticate, requireRole(roles), listResumeAts);
router.post('/score/:studentId', authenticate, requireRole(roles), scoreOne);
router.post('/score-batch', authenticate, requireRole(roles), scoreBatch);

export default router;
