import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';
import { emailQueue } from './queues/emailQueue';
import { initializeElasticsearchIndex } from './config/elasticsearch';

const app: Express = express();

app.use(cors());
app.use(express.json());

// Initialize Elasticsearch Index
initializeElasticsearchIndex();

// Setup verification health endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Configure Bull Board queue dashboard at /admin/queues
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue as any) as any],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

import { getSendersController } from './controllers/emailController';

// API Routes
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.get('/api/senders', getSendersController);

export default app;
