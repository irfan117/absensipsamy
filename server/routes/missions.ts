import { Router, Response } from 'express';
import { missionController } from '../controllers/index.js';
import { authenticateToken } from '../auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', missionController.getAll);
router.post('/', missionController.create);
router.patch('/:id', missionController.update);
router.put('/:id', missionController.update);
router.delete('/:id', missionController.delete);
router.post('/:id/submit', missionController.submitWork);
router.patch('/submissions/:id/review', missionController.review);

export default router;
