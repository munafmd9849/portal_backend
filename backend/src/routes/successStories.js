import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/successStories.js';

const router = express.Router();
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

/**
 * @openapi
 * /api/success-stories/public:
 *   get:
 *     tags: [Success Stories]
 *     summary: List published success stories
 *     description: Public endpoint — no authentication required.
 *     responses:
 *       200:
 *         description: Published stories
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/public', ctrl.listPublicStories);

/**
 * @openapi
 * /api/success-stories/public/{id}:
 *   get:
 *     tags: [Success Stories]
 *     summary: Get a published success story by ID
 *     description: Public endpoint — no authentication required.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Story details
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/public/:id', ctrl.getStory);

router.use(authenticate);

/**
 * @openapi
 * /api/success-stories:
 *   get:
 *     tags: [Success Stories]
 *     summary: List all success stories (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All stories
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     tags: [Success Stories]
 *     summary: Create a success story
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Story created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.listStoriesAdmin);

/**
 * @openapi
 * /api/success-stories/{id}:
 *   get:
 *     tags: [Success Stories]
 *     summary: Get success story by ID (admin)
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
 *         description: Story details
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   put:
 *     tags: [Success Stories]
 *     summary: Update a success story
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
 *         description: Story updated
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
 *   delete:
 *     tags: [Success Stories]
 *     summary: Delete a success story
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
 *         description: Story deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.getStory);
router.post('/', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.createStory);
router.put('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.updateStory);
router.delete('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.deleteStory);

/**
 * @openapi
 * /api/success-stories/media:
 *   post:
 *     tags: [Success Stories]
 *     summary: Upload success story media
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
  authorize(['ADMIN', 'SUPER_ADMIN']),
  mediaUpload.single('file'),
  ctrl.uploadStoryMedia
);

export default router;
