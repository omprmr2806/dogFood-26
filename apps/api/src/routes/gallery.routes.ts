import { Router } from 'express';
import { galleryController } from '../controllers/gallery.controller';
import { validateRequest } from '../validators';
import { galleryQuerySchema } from '../validators/submission.validator';

const router = Router();

// ==========================================
// PUBLIC GALLERY ENDPOINTS (100% Offline / Public)
// ==========================================

// Browse public submissions gallery with search, filtering, pagination
router.get(
  '/gallery',
  validateRequest(galleryQuerySchema),
  galleryController.getGallery
);

// View individual public project detail
router.get(
  '/gallery/:id',
  galleryController.getProject
);

export default router;
