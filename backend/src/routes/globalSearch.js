import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/globalSearch.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN', 'RECRUITER']));

router.get('/', ctrl.search);
router.get('/suggest', ctrl.suggest);
router.get('/meta', ctrl.searchMeta);

export default router;
