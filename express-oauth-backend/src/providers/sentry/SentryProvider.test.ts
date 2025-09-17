import { SentryProvider } from './SentryProvider';
import * as Sentry from '@sentry/node';
import { prisma } from '@/index';
import { SentryEventData } from '@/types';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  getCurrentHub: jest.fn(() => ({
    captureException: jest.fn().mockReturnValue('mock-event-id'),
    captureMessage: jest.fn().mockReturnValue('mock-event-id'),
    startTransaction: jest.fn().mockReturnValue({
      setStatus: jest.fn(),
      finish: jest.fn(),
    }),
  })),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  Scope: jest.fn().mockImplementation(() => ({
    setContext: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    setExtra: jest.fn(),
  })),
}));

// Mock Prisma
jest.mock('@/index', () => ({
  prisma: {
    sentryEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('SentryProvider', () => {
  let provider: SentryProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new SentryProvider();
  });

  describe('initialize', () => {
    it('should initialize Sentry with provided config', () => {
      const dsn = 'https://test@sentry.io/123';
      const environment = 'test';
      const release = '1.0.0';

      SentryProvider.initialize(dsn, environment, release);

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn,
        environment,
        release,
        integrations: expect.any(Array),
        tracesSampleRate: 1.0,
      });
    });
  });

  describe('captureException', () => {
    it('should capture exception and store in database', async () => {
      const error = new Error('Test error');
      const context = { extra: 'data' };
      const userId = 'test-user-id';

      (prisma.sentryEvent.create as jest.Mock).mockResolvedValueOnce({
        id: 'db-event-id',
        eventId: 'mock-event-id',
      });

      const eventId = await provider.captureException(error, context, userId);

      expect(eventId).toBe('mock-event-id');
      expect(prisma.sentryEvent.create).toHaveBeenCalledWith({
        data: {
          eventId: 'mock-event-id',
          level: 'error',
          message: 'Test error',
          exception: error.stack,
          userId,
          sentToSentry: true,
        },
      });
    });

    it('should capture exception without storing when no userId', async () => {
      const error = new Error('Test error');
      
      const eventId = await provider.captureException(error);

      expect(eventId).toBe('mock-event-id');
      expect(prisma.sentryEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('captureMessage', () => {
    it('should capture message and store in database', async () => {
      const message = 'Test message';
      const level = 'warning' as Sentry.SeverityLevel;
      const userId = 'test-user-id';

      (prisma.sentryEvent.create as jest.Mock).mockResolvedValueOnce({
        id: 'db-event-id',
        eventId: 'mock-event-id',
      });

      const eventId = await provider.captureMessage(message, level, userId);

      expect(eventId).toBe('mock-event-id');
      expect(prisma.sentryEvent.create).toHaveBeenCalledWith({
        data: {
          eventId: 'mock-event-id',
          level,
          message,
          userId,
          sentToSentry: true,
        },
      });
    });
  });

  describe('captureEvent', () => {
    it('should capture custom event with all properties', async () => {
      const eventData: SentryEventData = {
        level: 'error',
        message: 'Custom error',
        exception: {
          type: 'CustomError',
          value: 'Something went wrong',
          stacktrace: 'at test.js:1:1',
        },
        tags: { component: 'test' },
        extra: { debug: true },
        environment: 'test',
        release: '1.0.0',
      };
      const userId = 'test-user-id';

      (prisma.sentryEvent.create as jest.Mock).mockResolvedValueOnce({
        id: 'db-event-id',
        eventId: 'mock-event-id',
      });

      const eventId = await provider.captureEvent(eventData, userId);

      expect(eventId).toBe('mock-event-id');
      expect(prisma.sentryEvent.create).toHaveBeenCalledWith({
        data: {
          eventId: 'mock-event-id',
          level: 'error',
          message: 'Custom error',
          exception: JSON.stringify(eventData.exception),
          tags: JSON.stringify(eventData.tags),
          extra: JSON.stringify(eventData.extra),
          environment: 'test',
          release: '1.0.0',
          userId,
          sentToSentry: true,
        },
      });
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb to Sentry', () => {
      const breadcrumb = {
        category: 'test',
        message: 'Test breadcrumb',
        level: 'info' as Sentry.SeverityLevel,
      };

      provider.addBreadcrumb(breadcrumb);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });
  });

  describe('measurePerformance', () => {
    it('should measure performance of async operation', async () => {
      const operation = 'test-operation';
      const callback = jest.fn().mockResolvedValue('result');

      const result = await provider.measurePerformance(operation, callback);

      expect(result).toBe('result');
      expect(callback).toHaveBeenCalled();
    });

    it('should handle errors in performance measurement', async () => {
      const operation = 'test-operation';
      const error = new Error('Test error');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(provider.measurePerformance(operation, callback)).rejects.toThrow(error);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getStoredEvents', () => {
    it('should retrieve stored events for user', async () => {
      const mockEvents = [
        { id: '1', eventId: 'event-1', level: 'error' },
        { id: '2', eventId: 'event-2', level: 'warning' },
      ];

      (prisma.sentryEvent.findMany as jest.Mock).mockResolvedValueOnce(mockEvents);

      const events = await provider.getStoredEvents('test-user-id', 50);

      expect(prisma.sentryEvent.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(events).toEqual(mockEvents);
    });
  });

  describe('retryFailedEvents', () => {
    it('should retry failed events and update database', async () => {
      const failedEvents = [
        {
          id: '1',
          eventId: null,
          level: 'error',
          message: 'Failed event 1',
          exception: 'Error stack',
          sentToSentry: false,
        },
        {
          id: '2',
          eventId: null,
          level: 'info',
          message: 'Failed event 2',
          exception: null,
          sentToSentry: false,
        },
      ];

      (prisma.sentryEvent.findMany as jest.Mock).mockResolvedValueOnce(failedEvents);
      (prisma.sentryEvent.update as jest.Mock).mockResolvedValue({});

      const results = await provider.retryFailedEvents('test-user-id');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, eventId: 'mock-event-id' });
      expect(results[1]).toEqual({ success: true, eventId: 'mock-event-id' });
      expect(prisma.sentryEvent.update).toHaveBeenCalledTimes(2);
    });
  });
});