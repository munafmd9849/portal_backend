import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/globalSearch.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']));

/**
 * @openapi
 * /api/search:
 *   get:
 *     tags: [Search]
 *     summary: Global search across portal entities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Entity type filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', ctrl.search);

/**
 * @openapi
 * /api/search/suggest:
 *   get:
 *     tags: [Search]
 *     summary: Search autocomplete suggestions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Partial search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Suggestions
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/suggest', ctrl.suggest);

/**
 * @openapi
 * /api/search/meta:
 *   get:
 *     tags: [Search]
 *     summary: Get search metadata and filters
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search metadata
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/meta', ctrl.searchMeta);

export default router;
