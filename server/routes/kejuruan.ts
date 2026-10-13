import { Router, Response } from 'express';
import { kejuruanController } from '../controllers/index.js';

const router = Router();

router.get('/', kejuruanController.getAll);
router.post('/', kejuruanController.create);
router.patch('/:id', kejuruanController.update);
router.delete('/:id', kejuruanController.delete);

export default router;