import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';

export const QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // Initial 5-second backoff delay
    },
    removeOnComplete: false, // Keep job history for auditing
    removeOnFail: false,
  },
});

export interface EmailJobData {
  emailId: string;
  senderId: string;
}

/**
 * Schedules a delayed email processing job in BullMQ.
 * Uses the PostgreSQL Email ID as the BullMQ jobId to enforce 1:1 identity and idempotency.
 */
export async function scheduleEmailJob(
  emailId: string,
  senderId: string,
  sendAt: Date
) {
  const now = Date.now();
  const scheduledTime = sendAt.getTime();
  const rawDelay = scheduledTime - now;
  // If scheduled time was more than 1 minute in the past, throw an error
  if (rawDelay < -60000) {
    throw new Error('Scheduled time must be in the future.');
  }
  const delay = Math.max(0, rawDelay);

  // Idempotency check: check if a job with this emailId already exists in BullMQ
  const existingJob = await emailQueue.getJob(emailId);
  if (existingJob) {
    console.log(`[BullMQ] Job ${emailId} already exists in queue. Returning existing job.`);
    return existingJob;
  }

  const job = await emailQueue.add(
    'process-email',
    { emailId, senderId },
    {
      jobId: emailId, // Strict requirement: PostgreSQL Email ID as BullMQ jobId
      delay: Math.max(0, delay),
    }
  );

  console.log(`[BullMQ] Enqueued email job ${job.id} with delay ${delay}ms`);
  return job;
}

/**
 * Removes/cancels a scheduled job from BullMQ queue if it exists.
 */
export async function cancelEmailJob(emailId: string): Promise<boolean> {
  try {
    const job = await emailQueue.getJob(emailId);
    if (job) {
      await job.remove();
      console.log(`[BullMQ] Successfully removed job ${emailId} from queue.`);
      return true;
    }
  } catch (err) {
    console.warn(`[BullMQ Warning] Failed to remove job ${emailId} from queue:`, err);
  }
  return false;
}
