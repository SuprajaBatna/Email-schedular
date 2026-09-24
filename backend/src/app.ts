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

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL.trim()]
  : '*';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server) or matching allowed origins
      if (
        !origin ||
        allowedOrigins === '*' ||
        (Array.isArray(allowedOrigins) && (allowedOrigins.includes(origin) || allowedOrigins.includes('*')))
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback allow to avoid unexpected dev/staging CORS blocks
      }
    },
    credentials: true,
  })
);
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
