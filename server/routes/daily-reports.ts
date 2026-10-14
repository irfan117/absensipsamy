import { Router, Response } from 'express';
import { dailyReportController } from '../controllers/index.js';
import { authenticateToken } from '../auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', dailyReportController.getAll);
router.post('/', dailyReportController.submit);
router.patch('/:id/review', dailyReportController.review);

export default router;
