import { Router, Response } from 'express';
import { getPool } from '../config/index.js';
import { AuthenticatedRequest } from '../auth.js';

const router = Router();

router.put('/avatar', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
  }

  const avatar = String(req.body?.avatar || '').trim();
  if (!avatar) {
    return res.status(400).json({ success: false, message: 'URL avatar wajib diisi.' });
  }
  if (avatar.length > 2000) {
    return res.status(400).json({ success: false, message: 'URL avatar terlalu panjang.' });
  }

  try {
    await getPool().query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, user.id]);
    return res.json({ success: true, message: 'Avatar berhasil diperbarui.', avatar });
  } catch (error: any) {
    console.error('[Profile] update avatar error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui avatar.' });
  }
});

export default router;
