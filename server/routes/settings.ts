import { Router, Response } from 'express';
import { settingsController } from '../controllers/index.js';

const router = Router();

router.get('/', settingsController.getSettings);
router.put('/', settingsController.update);

export default router;