import * as Sentry from '@sentry/node';
import { SentryEventData } from '@/types';
import { prisma } from '@/index';

export class SentryProvider {
  private hub: Sentry.Hub;

  constructor() {
    this.hub = Sentry.getCurrentHub();
  }

  // Initialize Sentry for a specific user/project
  static initialize(dsn: string, environment?: string, release?: string) {
    return Sentry.init({
      dsn,
      environment: environment || process.env.NODE_ENV,
      release,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
      tracesSampleRate: 1.0,
    });
  }

  // Capture an exception
  async captureException(error: Error, context?: any, userId?: string) {
    const scope = new Sentry.Scope();
    
    if (context) {
      scope.setContext('additional', context);
    }
    
    if (userId) {
      scope.setUser({ id: userId });
    }

    const eventId = this.hub.captureException(error, scope);

    // Store in database
    if (userId) {
      await prisma.sentryEvent.create({
        data: {
          eventId,
          level: 'error',
          message: error.message,
          exception: error.stack,
          userId,
          sentToSentry: true,
        },
      });
    }

    return eventId;
  }

  // Capture a message
  async captureMessage(message: string, level: Sentry.SeverityLevel = 'info', userId?: string) {
    const eventId = this.hub.captureMessage(message, level);

    // Store in database
    if (userId) {
      await prisma.sentryEvent.create({
        data: {
          eventId,
          level,
          message,
          userId,
          sentToSentry: true,
        },
      });
    }

    return eventId;
  }

  // Capture a custom event
  async captureEvent(eventData: SentryEventData, userId?: string) {
    const scope = new Sentry.Scope();

    if (eventData.tags) {
      Object.entries(eventData.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (eventData.extra) {
      Object.entries(eventData.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    if (userId) {
      scope.setUser({ id: userId });
    }

    let eventId: string;

    if (eventData.exception) {
      const error = new Error(eventData.exception.value);
      error.name = eventData.exception.type;
      if (eventData.exception.stacktrace) {
        error.stack = eventData.exception.stacktrace;
      }
      eventId = this.hub.captureException(error, scope);
    } else {
      eventId = this.hub.captureMessage(eventData.message || 'Custom event', eventData.level, scope);
    }

    // Store in database
    await prisma.sentryEvent.create({
      data: {
        eventId,
        level: eventData.level,
        message: eventData.message,
        exception: eventData.exception ? JSON.stringify(eventData.exception) : null,
        tags: eventData.tags ? JSON.stringify(eventData.tags) : null,
        extra: eventData.extra ? JSON.stringify(eventData.extra) : null,
        environment: eventData.environment,
        release: eventData.release,
        userId,
        sentToSentry: true,
      },
    });

    return eventId;
  }

  // Add breadcrumb
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  }

  // Start a transaction
  startTransaction(name: string, operation: string) {
    return this.hub.startTransaction({
      name,
      op: operation,
    });
  }

  // Set user context
  setUser(user: Sentry.User | null) {
    Sentry.setUser(user);
  }

  // Set tags
  setTags(tags: Record<string, string>) {
    Object.entries(tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  // Set extra context
  setExtras(extras: Record<string, any>) {
    Object.entries(extras).forEach(([key, value]) => {
      Sentry.setExtra(key, value);
    });
  }

  // Performance monitoring
  async measurePerformance<T>(
    operation: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const transaction = this.startTransaction(operation, 'function');
    
    try {
      const result = await callback();
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  }

  // Get stored events from database
  async getStoredEvents(userId: string, limit = 100) {
    return prisma.sentryEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Retry failed events
  async retryFailedEvents(userId: string) {
    const failedEvents = await prisma.sentryEvent.findMany({
      where: {
        userId,
        sentToSentry: false,
      },
    });

    const results = [];

    for (const event of failedEvents) {
      try {
        let eventId: string;

        if (event.exception) {
          const error = new Error(event.message || 'Unknown error');
          error.stack = event.exception;
          eventId = this.hub.captureException(error);
        } else {
          eventId = this.hub.captureMessage(
            event.message || 'Retried event',
            event.level as Sentry.SeverityLevel
          );
        }

        await prisma.sentryEvent.update({
          where: { id: event.id },
          data: {
            eventId,
            sentToSentry: true,
          },
        });

        results.push({ success: true, eventId });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }
}