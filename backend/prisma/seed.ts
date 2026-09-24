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

  // Generate real Ethereal test accounts if needed for live testing
  console.log('Generating Ethereal SMTP test accounts for test senders...');
  const testAccount1 = await nodemailer.createTestAccount();
  const testAccount2 = await nodemailer.createTestAccount();

  // 2. Seed Test Sender 1 idempotently
  const sender1 = await prisma.sender.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {
      label: 'Test Sender 1 (Ethereal)',
      etherealEmail: testAccount1.user,
      etherealPass: testAccount1.pass,
      userId: testUser.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      userId: testUser.id,
      label: 'Test Sender 1 (Ethereal)',
      etherealEmail: testAccount1.user,
      etherealPass: testAccount1.pass,
    },
  });

  console.log(`Seeded Sender 1: ${sender1.label} (${sender1.etherealEmail})`);

  // 3. Seed Test Sender 2 idempotently
  const sender2 = await prisma.sender.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {
      label: 'Test Sender 2 (Ethereal)',
      etherealEmail: testAccount2.user,
      etherealPass: testAccount2.pass,
      userId: testUser.id,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      userId: testUser.id,
      label: 'Test Sender 2 (Ethereal)',
      etherealEmail: testAccount2.user,
      etherealPass: testAccount2.pass,
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
