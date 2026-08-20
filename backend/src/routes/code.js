import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { runCodeHandler, evaluateCodeHandler } from '../controllers/codeExecution.js';

const router = express.Router();

/**
 * @openapi
 * /api/code/run:
 *   post:
 *     tags: [Code]
 *     summary: Run code snippet
 *     description: Executes user code against optional stdin input. Rate-limited per user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               language:
 *                 type: string
 *                 description: Programming language identifier
 *               code:
 *                 type: string
 *               input:
 *                 type: string
 *                 description: Standard input for the program
 *     responses:
 *       200:
 *         description: Code execution result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 output:
 *                   type: string
 *                 error:
 *                   type: string
 *                 executionTime:
 *                   type: number
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/run', authenticate, runCodeHandler);

/**
 * @openapi
 * /api/code/evaluate:
 *   post:
 *     tags: [Code]
 *     summary: Evaluate code against test cases
 *     description: Runs user code against provided test cases and returns pass/fail results. Rate-limited per user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               language:
 *                 type: string
 *               code:
 *                 type: string
 *               testCases:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     input:
 *                       type: string
 *                     expectedOutput:
 *                       type: string
 *     responses:
 *       200:
 *         description: Evaluation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 passed:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 score:
 *                   type: number
 *                 results:
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
router.post('/evaluate', authenticate, evaluateCodeHandler);

export default router;
