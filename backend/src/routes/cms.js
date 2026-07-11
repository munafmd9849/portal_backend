import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import * as cms from '../controllers/cms.js';

const router = express.Router();
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

// Public published landing content
router.get('/public/landing', cms.getPublicLanding);

router.use(authenticate);

router.get('/sections', authorize(['SUPER_ADMIN', 'ADMIN']), cms.listCmsSections);
router.post('/sections', authorize(['SUPER_ADMIN']), cms.upsertCmsSection);
router.put('/sections/:id/status', authorize(['SUPER_ADMIN']), cms.setCmsSectionStatus);
router.delete('/sections/:id', authorize(['SUPER_ADMIN']), cms.deleteCmsSection);
router.post('/sections/reorder', authorize(['SUPER_ADMIN']), cms.reorderCmsSections);
router.post('/publish', authorize(['SUPER_ADMIN']), cms.publishCmsPage);
router.get('/versions', authorize(['SUPER_ADMIN']), cms.listCmsVersions);
router.post('/versions/:version/restore', authorize(['SUPER_ADMIN']), cms.restoreCmsVersion);
router.post(
  '/media',
  authorize(['SUPER_ADMIN']),
  mediaUpload.single('file'),
  cms.uploadCmsMedia
);

export default router;
