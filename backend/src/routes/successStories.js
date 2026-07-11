import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/successStories.js';

const router = express.Router();
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.get('/public', ctrl.listPublicStories);
router.get('/public/:id', ctrl.getStory);

router.use(authenticate);

router.get('/', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.listStoriesAdmin);
router.get('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.getStory);
router.post('/', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.createStory);
router.put('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.updateStory);
router.delete('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.deleteStory);
router.post(
  '/media',
  authorize(['ADMIN', 'SUPER_ADMIN']),
  mediaUpload.single('file'),
  ctrl.uploadStoryMedia
);

export default router;
