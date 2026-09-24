"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
exports.getRedisConnectionOptions = getRedisConnectionOptions;
exports.getHourlyRateLimitKey = getHourlyRateLimitKey;
const dotenv_1 = __importDefault(require("dotenv"));
const ioredis_1 = __importDefault(require("ioredis"));
dotenv_1.default.config();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
function getRedisConnectionOptions() {
    try {
        const parsed = new URL(redisUrl);
        return {
            host: parsed.hostname || 'localhost',
            port: parsed.port ? parseInt(parsed.port, 10) : 6379,
            username: parsed.username || undefined,
            password: parsed.password || undefined,
            maxRetriesPerRequest: null, // Required by BullMQ
        };
    }
    catch {
        return {
            host: 'localhost',
            port: 6379,
            maxRetriesPerRequest: null,
        };
    }
}
// Shared Redis client for atomic rate-limiting counters
exports.redisClient = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: null,
});
/**
 * Returns a Redis rate limit key formatted as rate-limit:sender:<senderId>:<YYYY-MM-DD-HH> (UTC)
 */
function getHourlyRateLimitKey(senderId, date = new Date()) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `rate-limit:sender:${senderId}:${year}-${month}-${day}-${hour}`;
}
