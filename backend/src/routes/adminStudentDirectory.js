import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getDirectory,
  exportDirectory,
  exportDirectoryToGoogleSheets,
  getStudentPanelData,
  getStudentResumeViewUrl,
} from '../controllers/adminStudentDirectory.js';

const router = express.Router();

router.get('/', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), getDirectory);
router.get('/export', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), exportDirectory);
router.post(
  '/export/google-sheets',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  exportDirectoryToGoogleSheets,
);
router.get(
  '/:studentId/panel',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  getStudentPanelData,
);
router.get(
  '/:studentId/resumes/:resumeId/view-url',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  getStudentResumeViewUrl,
);

export default router;
