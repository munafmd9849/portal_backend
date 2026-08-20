/**
 * Legacy Interview Routes — hard deprecated (P0 #2).
 * All traffic should use /api/admin/interview-scheduling.
 */

import express from 'express';

const router = express.Router();

/**
 * @openapi
 * /api/admin/interview/{path}:
 *   get:
 *     tags: [Interviews]
 *     summary: Legacy interview API (deprecated)
 *     deprecated: true
 *     description: |
 *       All legacy interview routes return HTTP 410 Gone.
 *       Migrate to `/api/admin/interview-scheduling` instead.
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Any legacy sub-path
 *     responses:
 *       410:
 *         description: Legacy API removed — use Interview Scheduling
 *   post:
 *     tags: [Interviews]
 *     summary: Legacy interview API (deprecated)
 *     deprecated: true
 *     description: Migrate to `/api/admin/interview-scheduling` instead.
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Legacy API removed
 *   put:
 *     tags: [Interviews]
 *     summary: Legacy interview API (deprecated)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Legacy API removed
 *   patch:
 *     tags: [Interviews]
 *     summary: Legacy interview API (deprecated)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Legacy API removed
 *   delete:
 *     tags: [Interviews]
 *     summary: Legacy interview API (deprecated)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Legacy API removed
 */
router.use((req, res) => {
  res.setHeader('X-Deprecated-API', 'Use /api/admin/interview-scheduling instead');
  res.status(410).json({
    error: 'Legacy interview API removed',
    message: 'Use Interview Scheduling at /api/admin/interview-scheduling instead.',
    migration: '/admin?tab=interviewScheduling',
  });
});

export default router;
