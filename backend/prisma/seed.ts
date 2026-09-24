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

  // Generate real Ethereal test accounts if needed for live testing (with robust fallback)
  console.log('Generating Ethereal SMTP test accounts for test senders...');
  let test1User = process.env.ETHEREAL_USER || 'sender1@ethereal.email';
  let test1Pass = process.env.ETHEREAL_PASS || 'pass123';
  let test2User = process.env.ETHEREAL_SENDER_2 || 'sender2@ethereal.email';
  let test2Pass = process.env.ETHEREAL_PASS || 'pass123';

  try {
    const testAccount1 = await nodemailer.createTestAccount();
    test1User = testAccount1.user;
    test1Pass = testAccount1.pass;

    const testAccount2 = await nodemailer.createTestAccount();
    test2User = testAccount2.user;
    test2Pass = testAccount2.pass;
  } catch (err) {
    console.warn('[Seed Warning] Could not dynamically generate Ethereal account, using default test credentials.');
  }

  // 2. Seed Test Sender 1 idempotently
  const sender1 = await prisma.sender.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {
      label: 'Test Sender 1 (Ethereal)',
      etherealEmail: test1User,
      etherealPass: test1Pass,
      userId: testUser.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      userId: testUser.id,
      label: 'Test Sender 1 (Ethereal)',
      etherealEmail: test1User,
      etherealPass: test1Pass,
    },
  });

  console.log(`Seeded Sender 1: ${sender1.label} (${sender1.etherealEmail})`);

  // 3. Seed Test Sender 2 idempotently
  const sender2 = await prisma.sender.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {
      label: 'Test Sender 2 (Ethereal)',
      etherealEmail: test2User,
      etherealPass: test2Pass,
      userId: testUser.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      userId: testUser.id,
      label: 'Test Sender 2 (Ethereal)',
      etherealEmail: test2User,
      etherealPass: test2Pass,
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
