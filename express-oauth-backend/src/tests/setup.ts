import { prisma } from '@/index';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.NODE_ENV = 'test';

// Clear database before each test
beforeEach(async () => {
  await prisma.$transaction([
    prisma.sentryEvent.deleteMany(),
    prisma.aIRequest.deleteMany(),
    prisma.oAuthToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});