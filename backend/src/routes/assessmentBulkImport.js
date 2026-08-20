import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/assessmentBulkImport.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

/**
 * @openapi
 * /api/assessment-imports/template:
 *   get:
 *     tags: [Assessment Imports]
 *     summary: Download bulk import CSV template
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV template file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/template', ctrl.downloadTemplate);

/**
 * @openapi
 * /api/assessment-imports/history:
 *   get:
 *     tags: [Assessment Imports]
 *     summary: List import batch history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Import history list
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/history', ctrl.listImportHistory);

/**
 * @openapi
 * /api/assessment-imports/{batchId}:
 *   get:
 *     tags: [Assessment Imports]
 *     summary: Get import batch details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Import batch details
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:batchId', ctrl.getImportBatch);

/**
 * @openapi
 * /api/assessment-imports/preview:
 *   post:
 *     tags: [Assessment Imports]
 *     summary: Preview a bulk import file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import preview
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/preview', ctrl.uploadImportFile, ctrl.previewImport);

/**
 * @openapi
 * /api/assessment-imports/{batchId}/commit:
 *   post:
 *     tags: [Assessment Imports]
 *     summary: Commit an import batch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Import committed
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:batchId/commit', ctrl.commitImport);

/**
 * @openapi
 * /api/assessment-imports/{batchId}/rollback:
 *   post:
 *     tags: [Assessment Imports]
 *     summary: Rollback an import batch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Import rolled back
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/:batchId/rollback', ctrl.rollbackImport);

export default router;
