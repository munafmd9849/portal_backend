import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getTurnIceServers } from '../controllers/webrtc.js';

const router = express.Router();

/**
 * @openapi
 * /api/webrtc/turn-ice-servers:
 *   get:
 *     tags: [WebRTC]
 *     summary: Get TURN/ICE server configuration
 *     description: Proxies Metered TURN credentials so the API key never reaches the browser. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ICE server configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 iceServers:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/turn-ice-servers', authenticate, getTurnIceServers);

export default router;
