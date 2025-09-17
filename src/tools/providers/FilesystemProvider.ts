// src/tools/providers/FilesystemProvider.ts

import { promises as fs } from 'fs';
import * as path from 'path';
import { IToolProvider, ToolManifest } from '../../types';

interface FindFileResult {
    path: string;
    size: number;
    lastModified: number;
}

/**
 * Provides tools for interacting with the local filesystem within the Obsidian vault.
 */
export class FilesystemProvider implements IToolProvider {
    constructor(private readonly root: string = process.cwd()) {}

    getManifest(): ToolManifest[] {
        return [
            {
                toolId: 'filesystem_find_file',
                description: 'Searches the workspace for files matching the provided substring.',
                argsSchema: {
                    query: { type: 'string', description: 'Case-insensitive substring to match.', required: true },
                    limit: { type: 'number', description: 'Maximum results to return (default 20).' },
                },
            },
            {
                toolId: 'filesystem_read_file',
                description: 'Reads a UTF-8 encoded text file from the workspace.',
                argsSchema: {
                    path: { type: 'string', description: 'Path to the file relative to the workspace root.', required: true },
                    encoding: { type: 'string', description: 'File encoding. Defaults to utf-8.' },
                },
            },
            {
                toolId: 'filesystem_write_file',
                description: 'Writes text content to a file, creating directories if necessary.',
                argsSchema: {
                    path: { type: 'string', description: 'Target file path relative to the workspace root.', required: true },
                    content: { type: 'string', description: 'Content to write to the file.', required: true },
                    encoding: { type: 'string', description: 'File encoding. Defaults to utf-8.' },
                },
            },
        ];
    }

    async execute(toolId: string, args: Record<string, any>): Promise<any> {
        switch (toolId) {
            case 'filesystem_find_file':
                return this.findFiles(String(args.query ?? ''), Number(args.limit ?? 20));
            case 'filesystem_read_file':
                return this.readFile(String(args.path), args.encoding ? String(args.encoding) : 'utf-8');
            case 'filesystem_write_file':
                return this.writeFile(String(args.path), String(args.content ?? ''), args.encoding ? String(args.encoding) : 'utf-8');
            default:
                throw new Error(`Tool "${toolId}" not found in FilesystemProvider.`);
        }
    }

    private resolvePath(relativePath: string): string {
        if (!relativePath || relativePath.includes('..')) {
            throw new Error('Invalid relative path.');
        }
        const resolved = path.resolve(this.root, relativePath);
        if (!resolved.startsWith(path.resolve(this.root))) {
            throw new Error('Attempted to access a path outside the workspace root.');
        }
        return resolved;
    }

    private async findFiles(query: string, limit: number): Promise<FindFileResult[]> {
        if (!query) {
            return [];
        }
        const results: FindFileResult[] = [];
        await this.walkDirectory(this.root, async (filePath: string, stats: { size: number; mtimeMs: number }) => {
            if (results.length >= limit) {
                return;
            }
            const relative = path.relative(this.root, filePath);
            if (relative.toLowerCase().includes(query.toLowerCase())) {
                results.push({ path: relative, size: stats.size, lastModified: Math.round(stats.mtimeMs) });
            }
        });
        return results;
    }

    private async readFile(relativePath: string, encoding: BufferEncoding): Promise<{ path: string; content: string }>{
        const filePath = this.resolvePath(relativePath);
        const content = await fs.readFile(filePath, { encoding });
        return { path: relativePath, content };
    }

    private async writeFile(relativePath: string, content: string, encoding: BufferEncoding): Promise<{ path: string; bytesWritten: number }>{
        const filePath = this.resolvePath(relativePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, { encoding });
        return { path: relativePath, bytesWritten: Buffer.byteLength(content, encoding) };
    }

    private async walkDirectory(dir: string, onFile: (filePath: string, stats: { size: number; mtimeMs: number }) => Promise<void>): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this.walkDirectory(fullPath, onFile);
            } else if (entry.isFile()) {
                const stats = await fs.stat(fullPath);
                await onFile(fullPath, { size: stats.size, mtimeMs: stats.mtimeMs });
            }
        }
    }
}
