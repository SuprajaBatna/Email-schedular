import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { QUEUE_NAME, EmailJobData } from '../queues/emailQueue';
import { getRedisConnectionOptions, redisClient, getHourlyRateLimitKey } from '../config/redis';
import prisma from '../config/prisma';
import { sendSlackRateLimitNotification } from '../services/slackService';
import { indexEmailInElasticsearch } from '../services/elasticsearchService';

// Worker Concurrency from environment (default: 5)
const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10) || 5;

// Minimum Send Delay from environment (default: 2000 ms)
const minDelayMs = parseInt(process.env.MIN_DELAY_MS || '2000', 10) || 2000;

// Max Emails Per Hour Per Sender from environment (default: 50)
const maxEmailsPerHour = parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50', 10) || 50;

console.log(`[Worker Configuration] Concurrency: ${workerConcurrency}, Min Delay: ${minDelayMs}ms, Max Emails/Hour/Sender: ${maxEmailsPerHour}`);

export const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { emailId } = job.data;
    const currentAttempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || 5;

    console.log(`[Worker] Processing job ${job.id} (Attempt ${currentAttempt}/${maxAttempts}) for email ID ${emailId} at ${new Date().toISOString()}`);

    // 1. Fetch Email and associated Sender from PostgreSQL
    const emailRecord = await prisma.email.findUnique({
      where: { id: emailId },
      include: { sender: true },
    });

    if (!emailRecord) {
      console.error(`[Worker Error] Email record ${emailId} not found in database.`);
      return;
    }

    if (!emailRecord.sender) {
      console.error(`[Worker Error] Associated sender record not found for email ${emailId}.`);
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'failed',
          failReason: 'Associated sender account not found in database.',
        },
      });
      return;
    }

    const { sender } = emailRecord;

    // 2. Redis-backed Atomic Hourly Rate Limiting (keyed by sender + UTC hour)
    const rateLimitKey = getHourlyRateLimitKey(sender.id);
    const currentCount = await redisClient.incr(rateLimitKey);

    if (currentCount === 1) {
      // Set a 2-hour (7200s) TTL on newly created counter keys for automatic memory cleanup
      await redisClient.expire(rateLimitKey, 7200);
    }

    console.log(`[Rate Limiter] Sender '${sender.label}' (${sender.id}) usage for current UTC hour: ${currentCount}/${maxEmailsPerHour}`);

    // 3. Handle Hourly Rate Limit Exceeded -> Reschedule to Next UTC Hour
    if (currentCount > maxEmailsPerHour) {
      // Calculate start of next UTC hour
      const nextHour = new Date();
      nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);

      // Apply deterministic ordering offset based on overflow index
      const overflowIndex = currentCount - maxEmailsPerHour;
      const offsetMs = overflowIndex * minDelayMs;
      const rescheduledTime = new Date(nextHour.getTime() + offsetMs);

      const delayMs = Math.max(1000, rescheduledTime.getTime() - Date.now());

      console.warn(
        `[Rate Limit Exceeded] Sender '${sender.label}' exceeded hourly limit (${currentCount}/${maxEmailsPerHour}). ` +
        `Rescheduling job ${job.id} to next UTC hour: ${rescheduledTime.toISOString()} (delay: ${delayMs}ms).`
      );

      // Send Slack Webhook Notification if user has connected Slack (Gracefully NO-OPs if not connected)
      await sendSlackRateLimitNotification(emailRecord.userId, sender.label, rescheduledTime);

      // Reschedule BullMQ job without marking it failed or consuming SMTP retries
      if (job.token) {
        await job.moveToDelayed(Date.now() + delayMs, job.token);
      }

      // Update PostgreSQL Email record
      await prisma.email.update({
        where: { id: emailId },
        data: {
          scheduledAt: rescheduledTime,
          status: 'pending',
          failReason: `Hourly rate limit (${maxEmailsPerHour}/hr) reached for sender '${sender.label}'. Rescheduled to ${rescheduledTime.toISOString()}`,
        },
      });

      // Update Elasticsearch Index (graceful fallback if ES offline)
      await indexEmailInElasticsearch({
        id: emailRecord.id,
        userId: emailRecord.userId,
        senderId: emailRecord.senderId,
        recipient: emailRecord.recipient,
        subject: emailRecord.subject,
        body: emailRecord.body,
        status: 'pending',
        scheduledAt: rescheduledTime,
        createdAt: emailRecord.createdAt,
      });

      // Exit worker function gracefully (job rescheduled, retries not consumed)
      return;
    }

    // 4. Transition status to 'processing' before SMTP dispatch
    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'processing' },
    });

    await indexEmailInElasticsearch({
      id: emailRecord.id,
      userId: emailRecord.userId,
      senderId: emailRecord.senderId,
      recipient: emailRecord.recipient,
      subject: emailRecord.subject,
      body: emailRecord.body,
      status: 'processing',
      scheduledAt: emailRecord.scheduledAt,
      createdAt: emailRecord.createdAt,
    });

    // 5. Create Nodemailer SMTP Transporter dynamically per sender
    try {
      if (!sender.etherealEmail || !sender.etherealPass) {
        throw new Error(`Sender '${sender.label}' is missing Ethereal SMTP credentials.`);
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // 587 uses STARTTLS
        auth: {
          user: sender.etherealEmail,
          pass: sender.etherealPass,
        },
      });

      // 6. Send Email via SMTP
      console.log(`[Worker] Dispatching email to ${emailRecord.recipient} via sender '${sender.label}' (${sender.etherealEmail})`);
      
      const info = await transporter.sendMail({
        from: `"${sender.label}" <${sender.etherealEmail}>`,
        to: emailRecord.recipient,
        subject: emailRecord.subject,
        html: emailRecord.body,
        text: emailRecord.body.replace(/<[^>]*>?/gm, ''),
      });

      const sentTimestamp = new Date();

      // 7. On successful delivery: update status to 'sent', record sentAt, clear failReason
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'sent',
          sentAt: sentTimestamp,
          failReason: null,
        },
      });

      await indexEmailInElasticsearch({
        id: emailRecord.id,
        userId: emailRecord.userId,
        senderId: emailRecord.senderId,
        recipient: emailRecord.recipient,
        subject: emailRecord.subject,
        body: emailRecord.body,
        status: 'sent',
        scheduledAt: emailRecord.scheduledAt,
        sentAt: sentTimestamp,
        createdAt: emailRecord.createdAt,
      });

      console.log(`[Worker] Email ${emailId} successfully sent! SMTP Message ID: ${info.messageId}`);

      // 8. Log Ethereal preview URL if available
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Worker] Ethereal Preview URL: ${previewUrl}`);
      }

    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown SMTP delivery error';
      console.error(`[Worker Delivery Error] Email ${emailId} attempt ${currentAttempt}/${maxAttempts} failed: ${errorMessage}`);

      // Decrement rate limit counter on actual delivery failure so slot can be reused if appropriate
      await redisClient.decr(rateLimitKey);

      // If all BullMQ retries are exhausted, update final DB status to 'failed'
      if (currentAttempt >= maxAttempts) {
        console.error(`[Worker] All ${maxAttempts} retry attempts exhausted for email ${emailId}. Marking as failed in database.`);
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'failed',
            failReason: errorMessage,
          },
        });

        await indexEmailInElasticsearch({
          id: emailRecord.id,
          userId: emailRecord.userId,
          senderId: emailRecord.senderId,
          recipient: emailRecord.recipient,
          subject: emailRecord.subject,
          body: emailRecord.body,
          status: 'failed',
          scheduledAt: emailRecord.scheduledAt,
          createdAt: emailRecord.createdAt,
        });
      } else {
        // Record intermediate failReason for visibility
        await prisma.email.update({
          where: { id: emailId },
          data: {
            failReason: `Attempt ${currentAttempt}/${maxAttempts} failed: ${errorMessage}`,
          },
        });
      }

      // Rethrow error so BullMQ handles automatic retries with exponential backoff
      throw error;
    }
  },
  {
    connection: getRedisConnectionOptions(),
    concurrency: workerConcurrency,
    limiter: {
      max: 1,
      duration: minDelayMs,
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed after attempt ${job?.attemptsMade}/${job?.opts.attempts || 5}:`, err.message);
});
