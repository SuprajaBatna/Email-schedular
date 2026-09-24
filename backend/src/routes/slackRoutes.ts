import { Router } from 'express';
import { connectSlack, slackCallback } from '../controllers/slackController';

const router = Router();

router.get('/connect', connectSlack);
router.get('/callback', slackCallback);

export default router;
