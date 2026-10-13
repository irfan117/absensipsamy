import { Router, Response } from 'express';
import { dailyReportController } from '../controllers/index.js';

const router = Router();

router.get('/', dailyReportController.getAll);
router.post('/', dailyReportController.submit);
router.patch('/:id/review', dailyReportController.review);

export default router;