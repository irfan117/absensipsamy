import { Router, Response } from 'express';
import { attendanceController } from '../controllers/index.js';

const router = Router();

router.get('/', attendanceController.getAll);
router.post('/', attendanceController.upsert);

export default router;