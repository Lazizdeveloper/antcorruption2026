import express from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ensureFields } from '../utils/validation.js';
import {
  buildUploadUrl,
  storeApplicationDocument,
  storeProfileImage,
} from '../utils/uploads.js';

const router = express.Router();

router.use(authenticate, requireRoles('admin', 'hr', 'candidate'));

router.post(
  '/profile-image',
  asyncHandler(async (req, res) => {
    ensureFields(req.body, ['fileName', 'contentBase64']);

    const storedFile = await storeProfileImage({
      fileName: req.body.fileName,
      mimeType: req.body.mimeType,
      contentBase64: req.body.contentBase64,
    });

    res.status(201).json({
      url: buildUploadUrl(req, storedFile.relativePath),
      mimeType: storedFile.mimeType,
      sizeKb: Math.max(1, Math.round(storedFile.sizeBytes / 1024)),
    });
  }),
);

router.post(
  '/application-document',
  asyncHandler(async (req, res) => {
    ensureFields(req.body, ['fileName', 'contentBase64']);

    const storedFile = await storeApplicationDocument({
      fileName: req.body.fileName,
      mimeType: req.body.mimeType,
      contentBase64: req.body.contentBase64,
    });

    res.status(201).json({
      url: buildUploadUrl(req, storedFile.relativePath),
      mimeType: storedFile.mimeType,
      sizeKb: Math.max(1, Math.round(storedFile.sizeBytes / 1024)),
    });
  }),
);

export default router;
