import { Router, Response } from 'express';
import { attendanceController } from '../controllers/index.js';

const router = Router();

router.get('/', attendanceController.getAll);
router.patch('/approve-pending-mentors', attendanceController.approvePendingMentors);
router.post('/', attendanceController.upsert);

export default router;
