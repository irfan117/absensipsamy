import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../auth.js';
import { createDirectUploadSignature } from '../cloudinary.js';

const router = Router();

router.post('/signature', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
  }

  const role = req.user.role;
  const userId = req.user.id;
  const requestedFolder = String(req.body?.folder || '').trim();

  // Sanitize and enforce role-based prefix
  const sanitizedSuffix = requestedFolder
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '')
    .slice(0, 50);

  const folder = `hadirku/${role}/${userId}${sanitizedSuffix ? '/' + sanitizedSuffix : ''}`;

  try {
    const signed = createDirectUploadSignature(folder);
    return res.json({ success: true, ...signed });
  } catch (error: any) {
    console.error('[Upload] signature error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal membuat tanda tangan upload Cloudinary.',
    });
  }
});

export default router;
