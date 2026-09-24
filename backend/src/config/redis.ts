import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export function getRedisConnectionOptions() {
  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

// Shared Redis client for atomic rate-limiting counters
export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

/**
 * Returns a Redis rate limit key formatted as rate-limit:sender:<senderId>:<YYYY-MM-DD-HH> (UTC)
 */
export function getHourlyRateLimitKey(senderId: string, date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `rate-limit:sender:${senderId}:${year}-${month}-${day}-${hour}`;
}
