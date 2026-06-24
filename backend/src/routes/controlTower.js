import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getFilters,
  getJobOpportunities,
  getStudents,
  getCareerServices,
  getAll,
} from '../controllers/controlTower.js';

const router = express.Router();
const roles = ['ADMIN', 'SUPER_ADMIN'];

router.get('/filters', authenticate, requireRole(roles), getFilters);
router.get('/job-opportunities', authenticate, requireRole(roles), getJobOpportunities);
router.get('/students', authenticate, requireRole(roles), getStudents);
router.get('/career-services', authenticate, requireRole(roles), getCareerServices);
router.get('/all', authenticate, requireRole(roles), getAll);

export default router;
