import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { aiManager } from '@/services/AIManager';
import { prisma } from '@/index';
import { AppError } from '@/middleware/errorHandler';
import { aiRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// List available providers
router.get('/providers', (req: AuthenticatedRequest, res: Response) => {
  const providers = aiManager.getAvailableProviders();
  res.json({ providers });
});

// List models
router.get('/models', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider } = req.query;
    const models = await aiManager.listModels(provider as string);
    res.json({ models });
  } catch (error) {
    throw error;
  }
});

// Chat completion
router.post('/chat', aiRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, model, messages, options } = req.body;
    const userId = req.user!.id;

    if (!provider || !model || !messages) {
      throw new AppError(400, 'Provider, model, and messages are required');
    }

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new AppError(400, 'Messages must be a non-empty array');
    }

    // Create AI request record
    const aiRequest = await prisma.aIRequest.create({
      data: {
        provider,
        model,
        prompt: JSON.stringify(messages),
        status: 'pending',
        userId,
      },
    });

    try {
      // Call AI provider
      const response = await aiManager.chat(provider, model, messages, options);

      // Update request record
      await prisma.aIRequest.update({
        where: { id: aiRequest.id },
        data: {
          response: response.content,
          tokens: response.usage?.totalTokens,
          cost: response.cost,
          status: 'completed',
        },
      });

      res.json({
        content: response.content,
        usage: response.usage,
        cost: response.cost,
        requestId: aiRequest.id,
      });
    } catch (error) {
      // Update request record with error
      await prisma.aIRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: 'failed',
          error: error.message,
        },
      });
      throw error;
    }
  } catch (error) {
    throw error;
  }
});

// Stream chat completion (SSE)
router.post('/chat/stream', aiRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, model, messages, options } = req.body;
    const userId = req.user!.id;

    if (!provider || !model || !messages) {
      throw new AppError(400, 'Provider, model, and messages are required');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Create AI request record
    const aiRequest = await prisma.aIRequest.create({
      data: {
        provider,
        model,
        prompt: JSON.stringify(messages),
        status: 'pending',
        userId,
      },
    });

    // For now, we'll do a regular call and stream the response
    // In a real implementation, you'd use the provider's streaming API
    try {
      const response = await aiManager.chat(provider, model, messages, {
        ...options,
        stream: true,
      });

      // Simulate streaming by chunking the response
      const chunks = response.content.match(/.{1,50}/g) || [];
      
      for (const chunk of chunks) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
      }

      // Send final message with usage info
      res.write(`data: ${JSON.stringify({ 
        done: true, 
        usage: response.usage,
        cost: response.cost,
      })}\n\n`);

      // Update request record
      await prisma.aIRequest.update({
        where: { id: aiRequest.id },
        data: {
          response: response.content,
          tokens: response.usage?.totalTokens,
          cost: response.cost,
          status: 'completed',
        },
      });

      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();

      // Update request record with error
      await prisma.aIRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: 'failed',
          error: error.message,
        },
      });
    }
  } catch (error) {
    throw error;
  }
});

// Get user's AI request history
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 50, offset = 0, provider, status } = req.query;

    const where: any = { userId };
    if (provider) where.provider = provider;
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.aIRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        select: {
          id: true,
          provider: true,
          model: true,
          status: true,
          tokens: true,
          cost: true,
          createdAt: true,
          prompt: true,
          response: true,
          error: true,
        },
      }),
      prisma.aIRequest.count({ where }),
    ]);

    // Parse JSON prompts
    const formattedRequests = requests.map(req => ({
      ...req,
      prompt: JSON.parse(req.prompt),
    }));

    res.json({
      requests: formattedRequests,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    throw error;
  }
});

// Get usage statistics
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

    // Get aggregated stats
    const stats = await prisma.aIRequest.groupBy({
      by: ['provider', 'status'],
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: {
        tokens: true,
        cost: true,
      },
    });

    // Get total costs by provider
    const costByProvider = await prisma.aIRequest.groupBy({
      by: ['provider'],
      where: {
        userId,
        createdAt: { gte: startDate },
        status: 'completed',
      },
      _sum: {
        cost: true,
      },
    });

    res.json({
      period,
      stats,
      costByProvider: costByProvider.map(item => ({
        provider: item.provider,
        totalCost: item._sum.cost || 0,
      })),
      totalRequests: stats.reduce((sum, item) => sum + item._count, 0),
      totalTokens: stats.reduce((sum, item) => sum + (item._sum.tokens || 0), 0),
      totalCost: stats.reduce((sum, item) => sum + (item._sum.cost || 0), 0),
    });
  } catch (error) {
    throw error;
  }
});

// Suggest provider for a model
router.get('/suggest-provider', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { model } = req.query;
    
    if (!model) {
      throw new AppError(400, 'Model parameter is required');
    }

    const suggestedProvider = aiManager.suggestProvider(model as string);
    
    res.json({
      model,
      suggestedProvider,
      availableProviders: aiManager.getAvailableProviders(),
    });
  } catch (error) {
    throw error;
  }
});

export default router;