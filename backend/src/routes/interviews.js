/**
 * Legacy Interview Routes — hard deprecated (P0 #2).
 * All traffic should use /api/admin/interview-scheduling.
 */

import express from 'express';

const router = express.Router();

router.use((req, res) => {
  res.setHeader('X-Deprecated-API', 'Use /api/admin/interview-scheduling instead');
  res.status(410).json({
    error: 'Legacy interview API removed',
    message: 'Use Interview Scheduling at /api/admin/interview-scheduling instead.',
    migration: '/admin?tab=interviewScheduling',
  });
});

export default router;
