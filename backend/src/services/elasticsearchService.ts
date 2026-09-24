import { esClient, EMAILS_INDEX } from '../config/elasticsearch';
import prisma from '../config/prisma';

export interface EmailElasticDoc {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt?: string | Date;
  sentAt?: string | Date | null;
  createdAt?: string | Date;
}

/**
 * Indexes or upserts an Email record into Elasticsearch using PostgreSQL Email.id as document ID.
 * Gracefully swallows errors if Elasticsearch is offline.
 */
export async function indexEmailInElasticsearch(doc: EmailElasticDoc): Promise<void> {
  try {
    await esClient.index({
      index: EMAILS_INDEX,
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
  } catch (error) {
    console.warn(`[Elasticsearch Warning] Failed to index document ${doc.id} in Elasticsearch. Graceful fallback active.`);
  }
}

/**
 * Performs full-text search across recipient, subject, and body fields.
 * Falls back to PostgreSQL search if Elasticsearch is unreachable or empty.
 */
export async function searchEmailsInElasticsearch(query: string) {
  try {
    const response = await esClient.search({
      index: EMAILS_INDEX,
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
  } catch (error) {
    console.warn(`[Elasticsearch Search Fallback] Searching via PostgreSQL for query: '${query}'`);
  }

  // Fallback to PostgreSQL Prisma search across recipient, subject, body
  const pgResults = await prisma.email.findMany({
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
