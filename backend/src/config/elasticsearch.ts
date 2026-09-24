import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const esNode = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const esClient = new Client({
  node: esNode,
  requestTimeout: 3000, // 3-second timeout for quick fallback
});

export const EMAILS_INDEX = 'emails';

/**
 * Initializes the Elasticsearch 'emails' index if it does not already exist.
 * Fails gracefully if Elasticsearch service is unreachable.
 */
export async function initializeElasticsearchIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAILS_INDEX,
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
      console.log(`[Elasticsearch] Index '${EMAILS_INDEX}' created successfully.`);
    } else {
      console.log(`[Elasticsearch] Index '${EMAILS_INDEX}' verified.`);
    }
  } catch (error) {
    console.warn(`[Elasticsearch Warning] Elasticsearch initialization skipped (Node unreachable at ${esNode}). Graceful fallback active.`);
  }
}
