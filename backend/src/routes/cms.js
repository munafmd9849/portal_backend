import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import * as cms from '../controllers/cms.js';

const router = express.Router();
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

/**
 * @openapi
 * /api/cms/public/landing:
 *   get:
 *     tags: [CMS]
 *     summary: Get published landing page content
 *     description: Public endpoint — no authentication required.
 *     responses:
 *       200:
 *         description: Published landing content
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/public/landing', cms.getPublicLanding);

router.use(authenticate);

/**
 * @openapi
 * /api/cms/sections:
 *   get:
 *     tags: [CMS]
 *     summary: List CMS sections
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CMS sections
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     tags: [CMS]
 *     summary: Create or update a CMS section (super admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Section saved
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/sections', authorize(['SUPER_ADMIN', 'ADMIN']), cms.listCmsSections);
router.post('/sections', authorize(['SUPER_ADMIN']), cms.upsertCmsSection);

/**
 * @openapi
 * /api/cms/sections/{id}/status:
 *   put:
 *     tags: [CMS]
 *     summary: Set CMS section status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Status updated
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
router.put('/sections/:id/status', authorize(['SUPER_ADMIN']), cms.setCmsSectionStatus);

/**
 * @openapi
 * /api/cms/sections/{id}:
 *   delete:
 *     tags: [CMS]
 *     summary: Delete a CMS section
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Section deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/sections/:id', authorize(['SUPER_ADMIN']), cms.deleteCmsSection);

/**
 * @openapi
 * /api/cms/sections/reorder:
 *   post:
 *     tags: [CMS]
 *     summary: Reorder CMS sections
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Sections reordered
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/sections/reorder', authorize(['SUPER_ADMIN']), cms.reorderCmsSections);

/**
 * @openapi
 * /api/cms/publish:
 *   post:
 *     tags: [CMS]
 *     summary: Publish CMS page
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Page published
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/publish', authorize(['SUPER_ADMIN']), cms.publishCmsPage);

/**
 * @openapi
 * /api/cms/versions:
 *   get:
 *     tags: [CMS]
 *     summary: List CMS page versions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Version history
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/versions', authorize(['SUPER_ADMIN']), cms.listCmsVersions);

/**
 * @openapi
 * /api/cms/versions/{version}/restore:
 *   post:
 *     tags: [CMS]
 *     summary: Restore a CMS page version
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Version restored
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/versions/:version/restore', authorize(['SUPER_ADMIN']), cms.restoreCmsVersion);

/**
 * @openapi
 * /api/cms/media:
 *   post:
 *     tags: [CMS]
 *     summary: Upload CMS media asset
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
 *         description: Media uploaded
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/media',
  authorize(['SUPER_ADMIN']),
  mediaUpload.single('file'),
  cms.uploadCmsMedia
);

export default router;
