import { Router, Response } from 'express';
import { settingsController } from '../controllers/index.js';
import { authenticateToken } from '../auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.update);

export default router;
