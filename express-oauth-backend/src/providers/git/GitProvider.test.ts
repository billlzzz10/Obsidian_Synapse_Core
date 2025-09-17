import { GitProvider } from './GitProvider';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';

// Mock simple-git
jest.mock('simple-git');
const mockedSimpleGit = simpleGit as jest.MockedFunction<typeof simpleGit>;

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('GitProvider', () => {
  let provider: GitProvider;
  let mockGit: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock git instance
    mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
      pull: jest.fn().mockResolvedValue({ files: [], summary: {} }),
      push: jest.fn().mockResolvedValue({ pushed: [] }),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue({ commit: 'abc123' }),
      branch: jest.fn().mockResolvedValue(undefined),
      checkoutLocalBranch: jest.fn().mockResolvedValue(undefined),
      checkout: jest.fn().mockResolvedValue(undefined),
      merge: jest.fn().mockResolvedValue({ failed: false }),
      status: jest.fn().mockResolvedValue({
        current: 'main',
        tracking: 'origin/main',
        ahead: 0,
        behind: 0,
        modified: [],
        created: [],
        deleted: [],
        renamed: [],
        conflicted: [],
        isClean: () => true,
      }),
      log: jest.fn().mockResolvedValue({
        all: [],
        latest: null,
        total: 0,
      }),
      getRemotes: jest.fn().mockResolvedValue([]),
      addRemote: jest.fn().mockResolvedValue(undefined),
      diff: jest.fn().mockResolvedValue(''),
      stash: jest.fn().mockResolvedValue('Saved working directory'),
      tags: jest.fn().mockResolvedValue({ all: [], latest: null }),
      addTag: jest.fn().mockResolvedValue(undefined),
      addAnnotatedTag: jest.fn().mockResolvedValue(undefined),
    };

    mockedSimpleGit.mockReturnValue(mockGit);
    provider = new GitProvider('/test/repos');
  });

  describe('ensureWorkDir', () => {
    it('should create work directory if it does not exist', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('ENOENT'));
      mockedFs.mkdir.mockResolvedValueOnce(undefined);

      await provider.ensureWorkDir();

      expect(mockedFs.mkdir).toHaveBeenCalledWith('/test/repos', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockedFs.access.mockResolvedValueOnce(undefined);

      await provider.ensureWorkDir();

      expect(mockedFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('clone', () => {
    beforeEach(() => {
      mockedFs.access.mockResolvedValue(undefined);
    });

    it('should clone repository successfully', async () => {
      const repoUrl = 'https://github.com/test/repo.git';
      mockedFs.access.mockRejectedValueOnce(new Error('ENOENT')); // Directory doesn't exist

      const result = await provider.clone(repoUrl);

      expect(mockGit.clone).toHaveBeenCalledWith(repoUrl, 'repo', undefined);
      expect(result.success).toBe(true);
      expect(result.path).toBe(path.join('/test/repos', 'repo'));
    });

    it('should use GitHub token if available', async () => {
      process.env.GITHUB_TOKEN = 'test-token';
      const repoUrl = 'https://github.com/test/repo.git';
      mockedFs.access.mockRejectedValueOnce(new Error('ENOENT'));

      await provider.clone(repoUrl);

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://test-token@github.com/test/repo.git',
        'repo',
        undefined
      );
    });

    it('should throw error if directory already exists', async () => {
      const repoUrl = 'https://github.com/test/repo.git';
      mockedFs.access.mockResolvedValueOnce(undefined); // Work dir exists
      mockedFs.access.mockResolvedValueOnce(undefined); // Target dir exists

      await expect(provider.clone(repoUrl)).rejects.toThrow('Directory repo already exists');
    });
  });

  describe('pull', () => {
    it('should pull latest changes', async () => {
      const pullResult = { files: ['file1.js'], summary: { changes: 1 } };
      mockGit.pull.mockResolvedValueOnce(pullResult);

      const result = await provider.pull('my-repo', 'origin', 'main');

      expect(mockedSimpleGit).toHaveBeenCalledWith(path.join('/test/repos', 'my-repo'));
      expect(result.success).toBe(true);
      expect(result.summary).toEqual(pullResult);
    });
  });

  describe('commit', () => {
    it('should commit all changes', async () => {
      const commitResult = { commit: 'abc123', branch: 'main' };
      mockGit.commit.mockResolvedValueOnce(commitResult);

      const result = await provider.commit('my-repo', 'Test commit');

      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith('Test commit');
      expect(result.success).toBe(true);
      expect(result.commit).toBe('abc123');
    });

    it('should commit specific files', async () => {
      const files = ['file1.js', 'file2.js'];
      const commitResult = { commit: 'def456', branch: 'main' };
      mockGit.commit.mockResolvedValueOnce(commitResult);

      const result = await provider.commit('my-repo', 'Test commit', files);

      expect(mockGit.add).toHaveBeenCalledWith(files);
      expect(mockGit.commit).toHaveBeenCalledWith('Test commit');
      expect(result.success).toBe(true);
    });
  });

  describe('createBranch', () => {
    it('should create and checkout branch', async () => {
      const result = await provider.createBranch('my-repo', 'feature-branch');

      expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature-branch');
      expect(result.success).toBe(true);
      expect(result.branch).toBe('feature-branch');
    });

    it('should create branch without checkout', async () => {
      const result = await provider.createBranch('my-repo', 'feature-branch', false);

      expect(mockGit.branch).toHaveBeenCalledWith(['feature-branch']);
      expect(mockGit.checkoutLocalBranch).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('status', () => {
    it('should get repository status', async () => {
      const statusResult = {
        current: 'main',
        tracking: 'origin/main',
        ahead: 2,
        behind: 1,
        modified: ['file1.js'],
        created: ['file2.js'],
        deleted: ['file3.js'],
        renamed: [],
        conflicted: [],
        isClean: () => false,
      };
      mockGit.status.mockResolvedValueOnce(statusResult);

      const result = await provider.status('my-repo');

      expect(result.success).toBe(true);
      expect(result.status.current).toBe('main');
      expect(result.status.modified).toEqual(['file1.js']);
      expect(result.status.isClean).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute clone operation', async () => {
      mockedFs.access.mockRejectedValueOnce(new Error('ENOENT'));
      
      const operation = {
        type: 'clone' as const,
        repository: 'https://github.com/test/repo.git',
      };

      const result = await provider.execute(operation);

      expect(mockGit.clone).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should execute pull operation', async () => {
      const operation = {
        type: 'pull' as const,
        repository: 'my-repo',
        branch: 'main',
      };

      const result = await provider.execute(operation);

      expect(mockGit.pull).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw error for unknown operation', async () => {
      const operation = {
        type: 'unknown' as any,
        repository: 'my-repo',
      };

      await expect(provider.execute(operation)).rejects.toThrow('Unknown operation: unknown');
    });
  });

  describe('extractRepoName', () => {
    it('should extract repository name from URL', () => {
      const provider = new GitProvider();
      
      // Access private method through any type casting
      const extractRepoName = (provider as any).extractRepoName.bind(provider);

      expect(extractRepoName('https://github.com/user/repo.git')).toBe('repo');
      expect(extractRepoName('https://github.com/user/another-repo')).toBe('another-repo');
      expect(extractRepoName('git@github.com:user/repo.git')).toBe('repo');
      expect(extractRepoName('invalid-url')).toBe('repository');
    });
  });
});