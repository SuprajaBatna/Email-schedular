"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleEmailController = scheduleEmailController;
exports.getEmailsController = getEmailsController;
exports.getSendersController = getSendersController;
exports.searchEmailsController = searchEmailsController;
const prisma_1 = __importDefault(require("../config/prisma"));
const emailQueue_1 = require("../queues/emailQueue");
const elasticsearchService_1 = require("../services/elasticsearchService");
/**
 * Controller to handle POST /api/emails/schedule
 */
async function scheduleEmailController(req, res) {
    try {
        const { userId, senderId, recipient, subject, body, scheduledAt } = req.body;
        // 1. Basic field validation
        if (!userId || !senderId || !recipient || !subject || !body || !scheduledAt) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, senderId, recipient, subject, body, scheduledAt are required.',
            });
        }
        // 2. Validate scheduledAt date
        const sendAtDate = new Date(scheduledAt);
        if (isNaN(sendAtDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid scheduledAt timestamp format.',
            });
        }
        if (sendAtDate.getTime() <= Date.now()) {
            return res.status(400).json({
                success: false,
                error: 'scheduledAt date must be in the future.',
            });
        }
        // 3. Validate user exists (or fallback to test user)
        let user = await prisma_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            // Find default user if specified userId not found
            user = await prisma_1.default.user.findFirst();
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                error: `User with ID ${userId} not found.`,
            });
        }
        // 4. Validate sender exists
        let sender = await prisma_1.default.sender.findUnique({
            where: { id: senderId },
        });
        if (!sender) {
            sender = await prisma_1.default.sender.findFirst({
                where: { userId: user.id },
            });
        }
        if (!sender) {
            return res.status(404).json({
                success: false,
                error: `Sender with ID ${senderId} not found.`,
            });
        }
        // 6. Create Email record in PostgreSQL with status 'pending'
        const emailRecord = await prisma_1.default.email.create({
            data: {
                userId: user.id,
                senderId: sender.id,
                recipient,
                subject,
                body,
                scheduledAt: sendAtDate,
                status: 'pending',
            },
        });
        // Index email in Elasticsearch (graceful fallback if ES offline)
        await (0, elasticsearchService_1.indexEmailInElasticsearch)({
            id: emailRecord.id,
            userId: emailRecord.userId,
            senderId: emailRecord.senderId,
            recipient: emailRecord.recipient,
            subject: emailRecord.subject,
            body: emailRecord.body,
            status: emailRecord.status,
            scheduledAt: emailRecord.scheduledAt,
            createdAt: emailRecord.createdAt,
        });
        // 7. Enqueue BullMQ delayed job using Email ID as BullMQ jobId
        let job;
        try {
            job = await (0, emailQueue_1.scheduleEmailJob)(emailRecord.id, sender.id, sendAtDate);
        }
        catch (enqueueError) {
            console.error(`[Schedule Controller] BullMQ enqueue failed for email ${emailRecord.id}:`, enqueueError);
            await prisma_1.default.email.update({
                where: { id: emailRecord.id },
                data: { failReason: 'Failed to enqueue BullMQ job' },
            });
            return res.status(500).json({
                success: false,
                error: 'Database record created but failed to enqueue email scheduling job in BullMQ.',
            });
        }
        // 8. Update Email record with bullJobId
        const updatedEmail = await prisma_1.default.email.update({
            where: { id: emailRecord.id },
            data: {
                bullJobId: job.id ? String(job.id) : emailRecord.id,
            },
        });
        // 9. Return success response
        return res.status(201).json({
            success: true,
            email: {
                id: updatedEmail.id,
                bullJobId: updatedEmail.bullJobId,
                scheduledAt: updatedEmail.scheduledAt.toISOString(),
                status: updatedEmail.status,
            },
        });
    }
    catch (error) {
        console.error('[Schedule Controller Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred while scheduling the email.',
        });
    }
}
/**
 * Controller to handle GET /api/emails?category=scheduled|sent
 */
async function getEmailsController(req, res) {
    try {
        const category = req.query.category || 'scheduled';
        const statusFilter = category === 'sent'
            ? { in: ['sent', 'failed'] }
            : { in: ['pending', 'processing'] };
        const emails = await prisma_1.default.email.findMany({
            where: {
                status: statusFilter,
            },
            include: {
                sender: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.status(200).json({
            success: true,
            category,
            count: emails.length,
            emails,
        });
    }
    catch (error) {
        console.error('[Get Emails Controller Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch email records.',
        });
    }
}
/**
 * Controller to handle GET /api/senders
 */
async function getSendersController(_req, res) {
    try {
        const senders = await prisma_1.default.sender.findMany({
            orderBy: { createdAt: 'asc' },
        });
        return res.status(200).json({
            success: true,
            count: senders.length,
            senders,
        });
    }
    catch (error) {
        console.error('[Get Senders Controller Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch senders list.',
        });
    }
}
/**
 * Controller to handle GET /api/emails/search?q=...
 */
async function searchEmailsController(req, res) {
    try {
        const query = req.query.q || '';
        if (!query.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Missing required search query parameter: q',
            });
        }
        const results = await (0, elasticsearchService_1.searchEmailsInElasticsearch)(query);
        return res.status(200).json({
            success: true,
            query,
            count: results.length,
            emails: results,
        });
    }
    catch (error) {
        console.error('[Search Controller Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while executing search query.',
        });
    }
}
