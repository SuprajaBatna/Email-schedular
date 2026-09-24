import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // 1. Seed Test User idempotently using upsert on unique email
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      name: 'Test User',
      googleId: 'google-test-id-123',
      avatar: 'https://via.placeholder.com/150',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
      googleId: 'google-test-id-123',
      name: 'Test User',
      avatar: 'https://via.placeholder.com/150',
    },
  });

  console.log(`Seeded Test User: ${testUser.email} (ID: ${testUser.id})`);

  // Determine Ethereal SMTP sender credentials from environment variables or local dev test account generator
  const isProd = process.env.NODE_ENV === 'production';
  const hasEnvSmtp = Boolean(process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS);

  let sender1User = process.env.ETHEREAL_SENDER_1 || process.env.ETHEREAL_USER || '';
  let sender1Pass = process.env.ETHEREAL_PASS || '';
  let sender2User = process.env.ETHEREAL_SENDER_2 || process.env.ETHEREAL_USER || '';
  let sender2Pass = process.env.ETHEREAL_PASS || '';

  if (hasEnvSmtp || isProd) {
    console.log(`[Seed SMTP] Using configured environment SMTP credentials (User: ${process.env.ETHEREAL_USER}). Replacement test accounts will NOT be generated.`);
  } else {
    console.log('[Seed SMTP] Local development mode with missing SMTP environment variables. Generating dynamic Ethereal test accounts...');
    try {
      const testAccount1 = await nodemailer.createTestAccount();
      sender1User = testAccount1.user;
      sender1Pass = testAccount1.pass;

      const testAccount2 = await nodemailer.createTestAccount();
      sender2User = testAccount2.user;
      sender2Pass = testAccount2.pass;
    } catch (err) {
      console.warn('[Seed Warning] Could not dynamically generate Ethereal test account, using fallback credentials.');
      sender1User = sender1User || 'sender1@ethereal.email';
      sender1Pass = sender1Pass || 'pass123';
      sender2User = sender2User || 'sender2@ethereal.email';
      sender2Pass = sender2Pass || 'pass123';
    }
  }

  // 2. Seed Test Sender 1 idempotently
  const sender1 = await prisma.sender.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {
      label: 'Test Sender 1 (Ethereal)',
      etherealEmail: sender1User,
      etherealPass: sender1Pass,
      userId: testUser.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      userId: testUser.id,
      label: 'Test Sender 1 (Ethereal)',
      etherealEmail: sender1User,
      etherealPass: sender1Pass,
    },
  });

  console.log(`Seeded Sender 1: ${sender1.label} (${sender1.etherealEmail})`);

  // 3. Seed Test Sender 2 idempotently
  const sender2 = await prisma.sender.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {
      label: 'Test Sender 2 (Ethereal)',
      etherealEmail: sender2User,
      etherealPass: sender2Pass,
      userId: testUser.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      userId: testUser.id,
      label: 'Test Sender 2 (Ethereal)',
      etherealEmail: sender2User,
      etherealPass: sender2Pass,
    },
  });

  console.log(`Seeded Sender 2: ${sender2.label} (${sender2.etherealEmail})`);
  console.log('Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
