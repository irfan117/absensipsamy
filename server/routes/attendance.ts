import { Router } from 'express';
import { attendanceController } from '../controllers/index.js';
import { authenticateToken } from '../auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', attendanceController.getAll);
router.post('/', attendanceController.upsert);
router.delete('/reset', attendanceController.reset);

export default router;
