"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = exports.QUEUE_NAME = void 0;
exports.scheduleEmailJob = scheduleEmailJob;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
exports.QUEUE_NAME = 'email-queue';
exports.emailQueue = new bullmq_1.Queue(exports.QUEUE_NAME, {
    connection: (0, redis_1.getRedisConnectionOptions)(),
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
/**
 * Schedules a delayed email processing job in BullMQ.
 * Uses the PostgreSQL Email ID as the BullMQ jobId to enforce 1:1 identity and idempotency.
 */
async function scheduleEmailJob(emailId, senderId, sendAt) {
    const now = Date.now();
    const scheduledTime = sendAt.getTime();
    const delay = scheduledTime - now;
    if (delay < 0) {
        throw new Error('Scheduled time must be in the future.');
    }
    // Idempotency check: check if a job with this emailId already exists in BullMQ
    const existingJob = await exports.emailQueue.getJob(emailId);
    if (existingJob) {
        console.log(`[BullMQ] Job ${emailId} already exists in queue. Returning existing job.`);
        return existingJob;
    }
    const job = await exports.emailQueue.add('process-email', { emailId, senderId }, {
        jobId: emailId, // Strict requirement: PostgreSQL Email ID as BullMQ jobId
        delay: Math.max(0, delay),
    });
    console.log(`[BullMQ] Enqueued email job ${job.id} with delay ${delay}ms`);
    return job;
}
