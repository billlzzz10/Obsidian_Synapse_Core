import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { GitOperation } from '@/types';

export class GitProvider {
  private git: SimpleGit;
  private workDir: string;

  constructor(workDir?: string) {
    this.workDir = workDir || path.join(process.cwd(), 'repos');
    
    const options: Partial<SimpleGitOptions> = {
      baseDir: this.workDir,
      binary: 'git',
      maxConcurrentProcesses: 6,
    };

    this.git = simpleGit(options);
  }

  // Initialize repository directory
  async ensureWorkDir() {
    try {
      await fs.access(this.workDir);
    } catch {
      await fs.mkdir(this.workDir, { recursive: true });
    }
  }

  // Clone a repository
  async clone(repoUrl: string, directory?: string, options?: any) {
    await this.ensureWorkDir();
    
    const targetDir = directory || this.extractRepoName(repoUrl);
    const fullPath = path.join(this.workDir, targetDir);

    // Check if directory already exists
    try {
      await fs.access(fullPath);
      throw new Error(`Directory ${targetDir} already exists`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw error;
      }
    }

    // Clone with authentication if token is provided
    let authUrl = repoUrl;
    if (process.env.GITHUB_TOKEN && repoUrl.includes('github.com')) {
      authUrl = repoUrl.replace(
        'https://github.com',
        `https://${process.env.GITHUB_TOKEN}@github.com`
      );
    }

    await this.git.clone(authUrl, targetDir, options);
    
    return {
      success: true,
      path: fullPath,
      message: `Repository cloned successfully to ${targetDir}`,
    };
  }

  // Pull latest changes
  async pull(repoPath: string, remote = 'origin', branch?: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const result = await git.pull(remote, branch);
    
    return {
      success: true,
      summary: result,
      message: `Pulled latest changes from ${remote}/${branch || 'current branch'}`,
    };
  }

  // Push changes
  async push(repoPath: string, remote = 'origin', branch?: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const result = await git.push(remote, branch);
    
    return {
      success: true,
      summary: result,
      message: `Pushed changes to ${remote}/${branch || 'current branch'}`,
    };
  }

  // Commit changes
  async commit(repoPath: string, message: string, files?: string[]) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    // Add files
    if (files && files.length > 0) {
      await git.add(files);
    } else {
      await git.add('.');
    }
    
    const result = await git.commit(message);
    
    return {
      success: true,
      commit: result.commit,
      message: `Committed changes: ${message}`,
    };
  }

  // Create and checkout branch
  async createBranch(repoPath: string, branchName: string, checkout = true) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    if (checkout) {
      await git.checkoutLocalBranch(branchName);
    } else {
      await git.branch([branchName]);
    }
    
    return {
      success: true,
      branch: branchName,
      message: `Created branch ${branchName}${checkout ? ' and checked out' : ''}`,
    };
  }

  // Switch branch
  async switchBranch(repoPath: string, branchName: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    await git.checkout(branchName);
    
    return {
      success: true,
      branch: branchName,
      message: `Switched to branch ${branchName}`,
    };
  }

  // Merge branches
  async merge(repoPath: string, fromBranch: string, options?: string[]) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const result = await git.merge([fromBranch, ...(options || [])]);
    
    return {
      success: !result.failed,
      result,
      message: result.failed ? 'Merge failed with conflicts' : `Merged ${fromBranch} successfully`,
    };
  }

  // Get repository status
  async status(repoPath: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const status = await git.status();
    
    return {
      success: true,
      status: {
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        renamed: status.renamed,
        conflicted: status.conflicted,
        isClean: status.isClean(),
      },
    };
  }

  // Get commit log
  async log(repoPath: string, options?: any) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const log = await git.log(options);
    
    return {
      success: true,
      commits: log.all,
      latest: log.latest,
      total: log.total,
    };
  }

  // Get branches
  async branches(repoPath: string, remote = false) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const branches = await git.branch(remote ? ['-r'] : []);
    
    return {
      success: true,
      branches: branches.all,
      current: branches.current,
    };
  }

  // Get remotes
  async remotes(repoPath: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const remotes = await git.getRemotes(true);
    
    return {
      success: true,
      remotes,
    };
  }

  // Add remote
  async addRemote(repoPath: string, name: string, url: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    await git.addRemote(name, url);
    
    return {
      success: true,
      message: `Added remote ${name} -> ${url}`,
    };
  }

  // Get diff
  async diff(repoPath: string, options?: string[]) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const diff = await git.diff(options);
    
    return {
      success: true,
      diff,
    };
  }

  // Stash changes
  async stash(repoPath: string, message?: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const result = await git.stash(['push', '-m', message || 'Stashed changes']);
    
    return {
      success: true,
      message: result || 'Changes stashed',
    };
  }

  // Apply stash
  async stashApply(repoPath: string, stashRef?: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    await git.stash(['apply', stashRef || 'stash@{0}']);
    
    return {
      success: true,
      message: 'Stash applied successfully',
    };
  }

  // Get tags
  async tags(repoPath: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    const tags = await git.tags();
    
    return {
      success: true,
      tags: tags.all,
      latest: tags.latest,
    };
  }

  // Create tag
  async createTag(repoPath: string, tagName: string, message?: string) {
    const git = simpleGit(path.join(this.workDir, repoPath));
    
    if (message) {
      await git.addAnnotatedTag(tagName, message);
    } else {
      await git.addTag(tagName);
    }
    
    return {
      success: true,
      tag: tagName,
      message: `Created tag ${tagName}`,
    };
  }

  // Helper method to extract repo name from URL
  private extractRepoName(url: string): string {
    const match = url.match(/\/([^\/]+?)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }

  // Execute a generic git operation
  async execute(operation: GitOperation) {
    switch (operation.type) {
      case 'clone':
        return this.clone(operation.repository!, operation.options?.directory);
      
      case 'pull':
        return this.pull(operation.repository!, operation.options?.remote, operation.branch);
      
      case 'push':
        return this.push(operation.repository!, operation.options?.remote, operation.branch);
      
      case 'commit':
        return this.commit(operation.repository!, operation.message!, operation.files);
      
      case 'branch':
        return this.createBranch(operation.repository!, operation.branch!);
      
      case 'merge':
        return this.merge(operation.repository!, operation.branch!);
      
      case 'status':
        return this.status(operation.repository!);
      
      case 'log':
        return this.log(operation.repository!, operation.options);
      
      default:
        throw new Error(`Unknown operation: ${operation.type}`);
    }
  }
}