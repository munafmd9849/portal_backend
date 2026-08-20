import express from 'express';
import { 
  getSchools, createSchool, updateSchool, deleteSchool,
  getCenters, createCenter, updateCenter, deleteCenter,
  getBatches, createBatch, updateBatch, deleteBatch 
} from '../controllers/academic.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Academic Structure Routes
 * Public GET routes for registration/filters
 * Protected POST/PATCH/DELETE routes for Super Admin management
 */

/**
 * @openapi
 * /api/academic/schools:
 *   get:
 *     tags: [Academic]
 *     summary: List schools (branches)
 *     description: Public endpoint for registration and admin filters. Returns active schools by default.
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean }
 *         description: Include inactive schools when true
 *     responses:
 *       200:
 *         description: List of schools
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/schools', getSchools);

/**
 * @openapi
 * /api/academic/centers:
 *   get:
 *     tags: [Academic]
 *     summary: List centers (campuses)
 *     description: Public endpoint for registration and admin filters. Returns active centers by default.
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean }
 *         description: Include inactive centers when true
 *     responses:
 *       200:
 *         description: List of centers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/centers', getCenters);

/**
 * @openapi
 * /api/academic/batches:
 *   get:
 *     tags: [Academic]
 *     summary: List batches
 *     description: Public endpoint for registration and admin filters. Returns active batches by default.
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean }
 *         description: Include inactive batches when true
 *     responses:
 *       200:
 *         description: List of batches
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/batches', getBatches);

// Protected routes (Super Admin management)
router.use(authenticate);

/**
 * @openapi
 * /api/academic/schools:
 *   post:
 *     tags: [Academic]
 *     summary: Create a school
 *     description: Super Admin only — create a new school (branch).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *     responses:
 *       201:
 *         description: School created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/schools', authorize('SUPER_ADMIN'), createSchool);

/**
 * @openapi
 * /api/academic/schools/{id}:
 *   patch:
 *     tags: [Academic]
 *     summary: Update a school
 *     description: Super Admin only — update school name, code, or status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               status: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200:
 *         description: School updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/schools/:id', authorize('SUPER_ADMIN'), updateSchool);

/**
 * @openapi
 * /api/academic/schools/{id}:
 *   delete:
 *     tags: [Academic]
 *     summary: Delete a school
 *     description: Super Admin only — delete a school if no students are assigned.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: School deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/schools/:id', authorize('SUPER_ADMIN'), deleteSchool);

/**
 * @openapi
 * /api/academic/centers:
 *   post:
 *     tags: [Academic]
 *     summary: Create a center
 *     description: Super Admin only — create a new center (campus).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *     responses:
 *       201:
 *         description: Center created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/centers', authorize('SUPER_ADMIN'), createCenter);

/**
 * @openapi
 * /api/academic/centers/{id}:
 *   patch:
 *     tags: [Academic]
 *     summary: Update a center
 *     description: Super Admin only — update center name, code, or status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               status: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200:
 *         description: Center updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/centers/:id', authorize('SUPER_ADMIN'), updateCenter);

/**
 * @openapi
 * /api/academic/centers/{id}:
 *   delete:
 *     tags: [Academic]
 *     summary: Delete a center
 *     description: Super Admin only — delete a center if no students are assigned.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Center deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/centers/:id', authorize('SUPER_ADMIN'), deleteCenter);

/**
 * @openapi
 * /api/academic/batches:
 *   post:
 *     tags: [Academic]
 *     summary: Create a batch
 *     description: Super Admin only — create a new batch.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *     responses:
 *       201:
 *         description: Batch created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/batches', authorize('SUPER_ADMIN'), createBatch);

/**
 * @openapi
 * /api/academic/batches/{id}:
 *   patch:
 *     tags: [Academic]
 *     summary: Update a batch
 *     description: Super Admin only — update batch name, code, or status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               status: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200:
 *         description: Batch updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/batches/:id', authorize('SUPER_ADMIN'), updateBatch);

/**
 * @openapi
 * /api/academic/batches/{id}:
 *   delete:
 *     tags: [Academic]
 *     summary: Delete a batch
 *     description: Super Admin only — delete a batch if no students are assigned.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Batch deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/batches/:id', authorize('SUPER_ADMIN'), deleteBatch);

export default router;
