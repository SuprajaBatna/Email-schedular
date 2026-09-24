import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import './workers/emailWorker';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`[BullMQ Worker] Email worker initialized and listening on email-queue`);
});
