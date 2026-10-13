import { Router, Response } from 'express';
import { leaveController } from '../controllers/index.js';

const router = Router();

router.get('/', leaveController.getAll);
router.post('/', leaveController.submit);
router.patch('/:id/review', leaveController.review);

export default router;