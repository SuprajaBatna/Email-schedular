"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAILS_INDEX = exports.esClient = void 0;
exports.initializeElasticsearchIndex = initializeElasticsearchIndex;
const elasticsearch_1 = require("@elastic/elasticsearch");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const esNode = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
exports.esClient = new elasticsearch_1.Client({
    node: esNode,
    requestTimeout: 3000, // 3-second timeout for quick fallback
});
exports.EMAILS_INDEX = 'emails';
/**
 * Initializes the Elasticsearch 'emails' index if it does not already exist.
 * Fails gracefully if Elasticsearch service is unreachable.
 */
async function initializeElasticsearchIndex() {
    try {
        const exists = await exports.esClient.indices.exists({ index: exports.EMAILS_INDEX });
        if (!exists) {
            await exports.esClient.indices.create({
                index: exports.EMAILS_INDEX,
                mappings: {
                    properties: {
                        id: { type: 'keyword' },
                        userId: { type: 'keyword' },
                        senderId: { type: 'keyword' },
                        recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                        subject: { type: 'text' },
                        body: { type: 'text' },
                        status: { type: 'keyword' },
                        scheduledAt: { type: 'date' },
                        sentAt: { type: 'date' },
                        createdAt: { type: 'date' },
                    },
                },
            });
            console.log(`[Elasticsearch] Index '${exports.EMAILS_INDEX}' created successfully.`);
        }
        else {
            console.log(`[Elasticsearch] Index '${exports.EMAILS_INDEX}' verified.`);
        }
    }
    catch (error) {
        console.warn(`[Elasticsearch Warning] Elasticsearch initialization skipped (Node unreachable at ${esNode}). Graceful fallback active.`);
    }
}
