import { Router, Response } from 'express';
import { attendanceController } from '../controllers/index.js';
import { authenticateToken } from '../auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', attendanceController.getAll);
router.post('/', attendanceController.upsert);

export default router;
