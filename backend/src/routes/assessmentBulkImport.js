import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/assessmentBulkImport.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

router.get('/template', ctrl.downloadTemplate);
router.get('/history', ctrl.listImportHistory);
router.get('/:batchId', ctrl.getImportBatch);
router.post('/preview', ctrl.uploadImportFile, ctrl.previewImport);
router.post('/:batchId/commit', ctrl.commitImport);
router.post('/:batchId/rollback', ctrl.rollbackImport);

export default router;
