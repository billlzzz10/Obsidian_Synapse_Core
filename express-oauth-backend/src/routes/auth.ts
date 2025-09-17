import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/index';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { ClickUpProvider } from '@/providers/clickup/ClickUpProvider';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

// Register
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(409, 'User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Login
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    throw error;
  }
});

// ClickUp OAuth - Get authorization URL
router.get('/clickup/authorize', (req: Request, res: Response) => {
  const state = uuidv4();
  
  // Store state in session
  (req.session as any).oauthState = state;
  
  const authUrl = ClickUpProvider.getAuthorizationUrl(state);
  
  res.json({ authUrl });
});

// ClickUp OAuth - Handle callback
router.get('/clickup/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    // Verify state
    if (state !== (req.session as any).oauthState) {
      throw new AppError(400, 'Invalid state parameter');
    }
    
    // Exchange code for token
    const tokenData = await ClickUpProvider.exchangeCodeForToken(code as string);
    
    // Get or create user (you might want to get user info from ClickUp API first)
    let user = await prisma.user.findFirst({
      where: { email: 'clickup-user@example.com' }, // Replace with actual user email from ClickUp
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'clickup-user@example.com', // Replace with actual user email
          name: 'ClickUp User',
        },
      });
    }
    
    // Store OAuth token
    await prisma.oAuthToken.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'clickup',
        },
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
      },
      create: {
        userId: user.id,
        provider: 'clickup',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
      },
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    // Clean up session
    delete (req.session as any).oauthState;
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${error.message}`);
  }
});

// Get OAuth tokens for user
router.get('/tokens', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    
    const tokens = await prisma.oAuthToken.findMany({
      where: { userId },
      select: {
        provider: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    
    res.json({ tokens });
  } catch (error) {
    throw error;
  }
});

// Revoke OAuth token
router.delete('/tokens/:provider', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { provider } = req.params;
    
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }
    
    await prisma.oAuthToken.delete({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });
    
    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    throw error;
  }
});

export default router;