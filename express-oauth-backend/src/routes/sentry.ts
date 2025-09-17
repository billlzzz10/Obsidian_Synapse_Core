import { Router, Response } from 'express';
import { AuthenticatedRequest, SentryEventData } from '@/types';
import { SentryProvider } from '@/providers/sentry/SentryProvider';
import { prisma } from '@/index';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

// Capture event
router.post('/capture', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const eventData: SentryEventData = req.body;

    if (!eventData.level) {
      throw new AppError(400, 'Event level is required');
    }

    const sentry = new SentryProvider();
    const eventId = await sentry.captureEvent(eventData, userId);

    res.json({
      success: true,
      eventId,
      message: 'Event captured successfully',
    });
  } catch (error) {
    throw error;
  }
});

// Capture exception
router.post('/exception', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, message, stack, context } = req.body;

    if (!name || !message) {
      throw new AppError(400, 'Exception name and message are required');
    }

    const error = new Error(message);
    error.name = name;
    if (stack) {
      error.stack = stack;
    }

    const sentry = new SentryProvider();
    const eventId = await sentry.captureException(error, context, userId);

    res.json({
      success: true,
      eventId,
      message: 'Exception captured successfully',
    });
  } catch (error) {
    throw error;
  }
});

// Capture message
router.post('/message', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { message, level = 'info' } = req.body;

    if (!message) {
      throw new AppError(400, 'Message is required');
    }

    const sentry = new SentryProvider();
    const eventId = await sentry.captureMessage(message, level as any, userId);

    res.json({
      success: true,
      eventId,
      message: 'Message captured successfully',
    });
  } catch (error) {
    throw error;
  }
});

// Add breadcrumb
router.post('/breadcrumb', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, message, level = 'info', type, data } = req.body;

    if (!category || !message) {
      throw new AppError(400, 'Category and message are required');
    }

    const sentry = new SentryProvider();
    sentry.addBreadcrumb({
      category,
      message,
      level: level as any,
      type,
      data,
      timestamp: Date.now() / 1000,
    });

    res.json({
      success: true,
      message: 'Breadcrumb added successfully',
    });
  } catch (error) {
    throw error;
  }
});

// Get user's Sentry events
router.get('/events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 100, level, sentToSentry } = req.query;

    const where: any = { userId };
    if (level) where.level = level;
    if (sentToSentry !== undefined) where.sentToSentry = sentToSentry === 'true';

    const events = await prisma.sentryEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    // Parse JSON fields
    const formattedEvents = events.map(event => ({
      ...event,
      tags: event.tags ? JSON.parse(event.tags) : null,
      extra: event.extra ? JSON.parse(event.extra) : null,
    }));

    res.json({ events: formattedEvents });
  } catch (error) {
    throw error;
  }
});

// Get event statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    // Get event counts by level
    const eventsByLevel = await prisma.sentryEvent.groupBy({
      by: ['level'],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get daily event counts
    const dailyEvents = await prisma.$queryRaw`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        level
      FROM SentryEvent
      WHERE userId = ${userId}
        AND createdAt >= ${startDate}
      GROUP BY DATE(createdAt), level
      ORDER BY date DESC
    `;

    res.json({
      period,
      eventsByLevel: eventsByLevel.map(item => ({
        level: item.level,
        count: item._count,
      })),
      dailyEvents,
      totalEvents: eventsByLevel.reduce((sum, item) => sum + item._count, 0),
    });
  } catch (error) {
    throw error;
  }
});

// Retry failed events
router.post('/retry', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const sentry = new SentryProvider();
    const results = await sentry.retryFailedEvents(userId);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Retried ${results.length} events: ${successful} successful, ${failed} failed`,
      results,
    });
  } catch (error) {
    throw error;
  }
});

// Initialize Sentry for a project
router.post('/initialize', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dsn, environment, release } = req.body;

    if (!dsn) {
      throw new AppError(400, 'DSN is required');
    }

    SentryProvider.initialize(dsn, environment, release);

    res.json({
      success: true,
      message: 'Sentry initialized successfully',
    });
  } catch (error) {
    throw error;
  }
});

// Performance monitoring endpoint
router.post('/performance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { operation, duration, status = 'ok' } = req.body;

    if (!operation || !duration) {
      throw new AppError(400, 'Operation and duration are required');
    }

    const sentry = new SentryProvider();
    const transaction = sentry.startTransaction(operation, 'http.server');
    transaction.setStatus(status);
    
    // Simulate the duration
    setTimeout(() => {
      transaction.finish();
    }, 0);

    res.json({
      success: true,
      message: 'Performance data captured',
    });
  } catch (error) {
    throw error;
  }
});

export default router;