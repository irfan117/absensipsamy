import { Router, Response } from 'express';
import { hallOfFameController } from '../controllers/index.js';

const router = Router();

router.get('/trainees', hallOfFameController.getTrainee);
router.get('/mentors', hallOfFameController.getMentor);
router.post('/reset-trainee-points', hallOfFameController.resetTraineePoints);
router.post('/reset-mentor-data', hallOfFameController.resetMentorData);

export default router;