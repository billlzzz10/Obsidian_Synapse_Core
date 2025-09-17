import { Router, Response } from 'express';
import path from 'path';
import { AuthenticatedRequest } from '@/types';
import { GitProvider } from '@/providers/git/GitProvider';
import { AppError } from '@/middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create a user-specific GitProvider
function getUserGitProvider(userId: string): GitProvider {
  const userWorkDir = path.join(process.cwd(), 'repos', userId);
  return new GitProvider(userWorkDir);
}

// Clone repository
router.post('/clone', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { url, directory, options } = req.body;

    if (!url) {
      throw new AppError(400, 'Repository URL is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.clone(url, directory, options);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Pull changes
router.post('/pull', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, remote = 'origin', branch } = req.body;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.pull(repository, remote, branch);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Push changes
router.post('/push', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, remote = 'origin', branch } = req.body;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.push(repository, remote, branch);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Commit changes
router.post('/commit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, message, files } = req.body;

    if (!repository || !message) {
      throw new AppError(400, 'Repository path and commit message are required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.commit(repository, message, files);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Get repository status
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository } = req.query;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.status(repository as string);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Get commit log
router.get('/log', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, maxCount = 50 } = req.query;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.log(repository as string, { maxCount: Number(maxCount) });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// List branches
router.get('/branches', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, remote = false } = req.query;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.branches(repository as string, remote === 'true');

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Create branch
router.post('/branch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, name, checkout = true } = req.body;

    if (!repository || !name) {
      throw new AppError(400, 'Repository path and branch name are required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.createBranch(repository, name, checkout);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Switch branch
router.post('/checkout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, branch } = req.body;

    if (!repository || !branch) {
      throw new AppError(400, 'Repository path and branch name are required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.switchBranch(repository, branch);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Merge branches
router.post('/merge', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, fromBranch, options } = req.body;

    if (!repository || !fromBranch) {
      throw new AppError(400, 'Repository path and source branch are required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.merge(repository, fromBranch, options);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Get diff
router.get('/diff', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, options } = req.query;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const optionsArray = options ? (options as string).split(',') : undefined;
    const result = await git.diff(repository as string, optionsArray);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// List remotes
router.get('/remotes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository } = req.query;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.remotes(repository as string);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Add remote
router.post('/remote', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, name, url } = req.body;

    if (!repository || !name || !url) {
      throw new AppError(400, 'Repository path, remote name, and URL are required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.addRemote(repository, name, url);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// List tags
router.get('/tags', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository } = req.query;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.tags(repository as string);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Create tag
router.post('/tag', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, name, message } = req.body;

    if (!repository || !name) {
      throw new AppError(400, 'Repository path and tag name are required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.createTag(repository, name, message);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Stash changes
router.post('/stash', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, message } = req.body;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.stash(repository, message);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Apply stash
router.post('/stash/apply', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { repository, stashRef } = req.body;

    if (!repository) {
      throw new AppError(400, 'Repository path is required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.stashApply(repository, stashRef);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

// Execute generic operation
router.post('/execute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const operation = req.body;

    if (!operation.type || !operation.repository) {
      throw new AppError(400, 'Operation type and repository are required');
    }

    const git = getUserGitProvider(userId);
    const result = await git.execute(operation);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    throw error;
  }
});

export default router;