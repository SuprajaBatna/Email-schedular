import { Router } from 'express';
import {
  scheduleEmailController,
  getEmailsController,
  getSendersController,
  searchEmailsController,
  cancelEmailController,
} from '../controllers/emailController';

const router = Router();

router.post('/schedule', scheduleEmailController);
router.get('/', getEmailsController);
router.get('/search', searchEmailsController);
router.delete('/:id/cancel', cancelEmailController);

export default router;
