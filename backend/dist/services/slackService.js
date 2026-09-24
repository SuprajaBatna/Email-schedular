"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSlackRateLimitNotification = sendSlackRateLimitNotification;
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Sends a real Slack webhook notification when a sender's rate limit is reached.
 * Gracefully NO-OPs if Slack is not connected for the specified user.
 */
async function sendSlackRateLimitNotification(userId, senderLabel, rescheduledTime) {
    try {
        // 1. Query SlackIntegration record for user
        const slackIntegration = await prisma_1.default.slackIntegration.findUnique({
            where: { userId },
        });
        // 2. Graceful NO-OP if user has not connected Slack
        if (!slackIntegration || !slackIntegration.webhookUrl) {
            console.log(`[Slack Service] Slack is not connected for user ${userId}. Gracefully skipping notification (NO-OP).`);
            return;
        }
        // 3. Format notification message payload
        const messagePayload = {
            text: `⚠️ *ReachInbox Rate Limit Alert*\n` +
                `• *Sender*: ${senderLabel}\n` +
                `• *Event*: Sender reached hourly limit. Email rescheduled to next hour.\n` +
                `• *Next Dispatch*: ${rescheduledTime.toISOString()}`,
        };
        // 4. Dispatch HTTP POST to Slack Webhook URL
        const response = await fetch(slackIntegration.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messagePayload),
        });
        if (response.ok) {
            console.log(`[Slack Service] Webhook notification sent successfully to Slack for user ${userId}`);
        }
        else {
            console.warn(`[Slack Service] Webhook dispatch returned HTTP ${response.status}: ${await response.text()}`);
        }
    }
    catch (error) {
        // Graceful error handling - never throw or block email worker execution
        console.error(`[Slack Service Warning] Failed to dispatch Slack webhook notification for user ${userId}:`, error);
    }
}
