import { Router, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from '../config/index.js';
import { kejuruanController } from '../controllers/index.js';
import { AuthenticatedRequest, authenticateToken } from '../auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', kejuruanController.getAll);
router.get('/catalog', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !['admin', 'mentor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Akses katalog kejuruan tidak diizinkan.' });
  }
  try {
    const [rows] = await getPool().query<any[]>('SELECT id,name,code,category,color,description,mentor_id,mentor_name FROM kejuruan ORDER BY name');
    let pendingRequest: { kejuruanId: string; kejuruanName: string } | undefined;
    if (req.user.role === 'mentor') {
      const [requests] = await getPool().query<any[]>(
        `SELECT r.kejuruan_id,k.name FROM mentor_kejuruan_requests r JOIN kejuruan k ON k.id = r.kejuruan_id
         WHERE r.mentor_id = ? AND r.status = 'pending' ORDER BY r.requested_at DESC LIMIT 1`,
        [req.user.id],
      );
      if (requests[0]) pendingRequest = { kejuruanId: String(requests[0].kejuruan_id), kejuruanName: String(requests[0].name) };
    }
    return res.json({ success: true, pendingRequest, kejuruanList: rows.map((row) => ({
      id: String(row.id), name: String(row.name), code: String(row.code || ''), category: String(row.category || ''),
      color: String(row.color || '#2563eb'), description: String(row.description || ''),
      mentorId: row.mentor_id || undefined, mentorName: row.mentor_name || undefined,
    })) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Gagal memuat katalog kejuruan.' });
  }
});

router.post('/requests', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'mentor') return res.status(403).json({ success: false, message: 'Pengajuan kejuruan hanya dapat dilakukan mentor.' });
  const kejuruanId = String(req.body?.kejuruanId || '').trim();
  try {
    const pool = getPool();
    const [programs] = await pool.query<any[]>('SELECT id,name FROM kejuruan WHERE id = ? LIMIT 1', [kejuruanId]);
    if (!programs.length) return res.status(400).json({ success: false, message: 'Pilih kejuruan dari katalog admin.' });
    const [pending] = await pool.query<any[]>("SELECT id FROM mentor_kejuruan_requests WHERE mentor_id = ? AND status = 'pending' ORDER BY requested_at DESC LIMIT 1", [req.user.id]);
    if (pending.length) {
      await pool.query('UPDATE mentor_kejuruan_requests SET kejuruan_id = ?, requested_at = NOW(), reviewed_by = NULL, reviewed_at = NULL, review_note = NULL WHERE id = ?', [kejuruanId, pending[0].id]);
    } else {
      await pool.query('INSERT INTO mentor_kejuruan_requests (id,mentor_id,kejuruan_id,status,requested_at) VALUES (?,?,?,\'pending\',NOW())', [randomUUID(), req.user.id, kejuruanId]);
    }
    return res.status(202).json({ success: true, message: `Pengajuan kejuruan “${programs[0].name}” terkirim dan menunggu verifikasi admin.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Gagal mengirim pengajuan kejuruan.' });
  }
});

router.get('/requests', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat melihat pengajuan kejuruan.' });
  try {
    const [rows] = await getPool().query<any[]>(
      `SELECT r.id,r.mentor_id,r.kejuruan_id,r.status,r.requested_at,u.name AS mentor_name,u.nim AS mentor_nim,k.name AS kejuruan_name
       FROM mentor_kejuruan_requests r JOIN users u ON u.id = r.mentor_id JOIN kejuruan k ON k.id = r.kejuruan_id
       WHERE r.status = 'pending' ORDER BY r.requested_at ASC`
    );
    return res.json({ success: true, requests: rows.map((r) => ({
      id: String(r.id), mentorId: String(r.mentor_id), mentorName: String(r.mentor_name || ''), mentorNim: String(r.mentor_nim || ''),
      kejuruanId: String(r.kejuruan_id), kejuruanName: String(r.kejuruan_name || ''), status: r.status,
      requestedAt: r.requested_at,
    })) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Gagal memuat pengajuan kejuruan.' });
  }
});

router.put('/requests/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Hanya admin yang dapat memverifikasi kejuruan.' });
  const decision = String(req.body?.decision || '');
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ success: false, message: 'Keputusan verifikasi tidak valid.' });
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [requests] = await connection.query<any[]>(
      "SELECT r.mentor_id,r.kejuruan_id,k.name AS kejuruan_name,k.mentor_id AS assigned_mentor_id,u.name AS mentor_name FROM mentor_kejuruan_requests r JOIN kejuruan k ON k.id = r.kejuruan_id JOIN users u ON u.id = r.mentor_id WHERE r.id = ? AND r.status = 'pending' FOR UPDATE",
      [req.params.id],
    );
    const request = requests[0];
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Pengajuan tidak ditemukan atau sudah diverifikasi.' });
    }
    if (decision === 'approved' && request.assigned_mentor_id && String(request.assigned_mentor_id) !== String(request.mentor_id)) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Kejuruan ini sudah menjadi tanggung jawab mentor lain.' });
    }
    if (decision === 'approved') {
      await connection.query('UPDATE users SET kejuruan_id = ?,kejuruan_name = ? WHERE id = ? AND role = \'mentor\'', [request.kejuruan_id, request.kejuruan_name, request.mentor_id]);
      await connection.query('UPDATE kejuruan SET mentor_id = ?,mentor_name = ? WHERE id = ?', [request.mentor_id, request.mentor_name, request.kejuruan_id]);
    }
    await connection.query('UPDATE mentor_kejuruan_requests SET status = ?,reviewed_by = ?,reviewed_at = NOW() WHERE id = ?', [decision, req.user!.id, req.params.id]);
    await connection.commit();
    return res.json({ success: true, message: decision === 'approved' ? 'Kejuruan mentor berhasil diverifikasi.' : 'Pengajuan kejuruan ditolak.' });
  } catch (error: any) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: error?.message || 'Gagal memverifikasi kejuruan mentor.' });
  } finally {
    connection.release();
  }
});
router.post('/', kejuruanController.create);
router.patch('/:id', kejuruanController.update);
router.delete('/:id', kejuruanController.delete);

export default router;
