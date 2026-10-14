import { Router } from 'express';
import { usersController } from '../controllers/index.js';
import { authenticateToken } from '../auth.js';

const router = Router();
router.use(authenticateToken);
router.get('/', usersController.getAll);

export default router;
