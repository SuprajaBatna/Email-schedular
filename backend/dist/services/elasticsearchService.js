"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexEmailInElasticsearch = indexEmailInElasticsearch;
exports.searchEmailsInElasticsearch = searchEmailsInElasticsearch;
const elasticsearch_1 = require("../config/elasticsearch");
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Indexes or upserts an Email record into Elasticsearch using PostgreSQL Email.id as document ID.
 * Gracefully swallows errors if Elasticsearch is offline.
 */
async function indexEmailInElasticsearch(doc) {
    try {
        await elasticsearch_1.esClient.index({
            index: elasticsearch_1.EMAILS_INDEX,
            id: doc.id,
            document: {
                id: doc.id,
                userId: doc.userId,
                senderId: doc.senderId,
                recipient: doc.recipient,
                subject: doc.subject,
                body: doc.body,
                status: doc.status,
                scheduledAt: doc.scheduledAt ? new Date(doc.scheduledAt).toISOString() : undefined,
                sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
                createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
            },
        });
        console.log(`[Elasticsearch] Indexed email document ${doc.id} (Status: ${doc.status})`);
    }
    catch (error) {
        console.warn(`[Elasticsearch Warning] Failed to index document ${doc.id} in Elasticsearch. Graceful fallback active.`);
    }
}
/**
 * Performs full-text search across recipient, subject, and body fields.
 * Falls back to PostgreSQL search if Elasticsearch is unreachable or empty.
 */
async function searchEmailsInElasticsearch(query) {
    try {
        const response = await elasticsearch_1.esClient.search({
            index: elasticsearch_1.EMAILS_INDEX,
            query: {
                multi_match: {
                    query,
                    fields: ['subject^3', 'recipient^2', 'body'],
                    fuzziness: 'AUTO',
                },
            },
        });
        const hits = response.hits.hits;
        if (hits && hits.length > 0) {
            return hits.map((hit) => hit._source);
        }
    }
    catch (error) {
        console.warn(`[Elasticsearch Search Fallback] Searching via PostgreSQL for query: '${query}'`);
    }
    // Fallback to PostgreSQL Prisma search across recipient, subject, body
    const pgResults = await prisma_1.default.email.findMany({
        where: {
            OR: [
                { subject: { contains: query, mode: 'insensitive' } },
                { recipient: { contains: query, mode: 'insensitive' } },
                { body: { contains: query, mode: 'insensitive' } },
            ],
        },
        orderBy: { createdAt: 'desc' },
    });
    return pgResults;
}
