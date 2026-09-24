import { Router } from 'express';
import {
  scheduleEmailController,
  getEmailsController,
  getSendersController,
  searchEmailsController,
} from '../controllers/emailController';

const router = Router();

router.post('/schedule', scheduleEmailController);
router.get('/', getEmailsController);
router.get('/search', searchEmailsController);

export default router;
