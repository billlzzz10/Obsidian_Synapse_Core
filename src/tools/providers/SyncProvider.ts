// src/tools/providers/SyncProvider.ts

import { indexStore, IndexStore } from '../../services/IndexStore';
import { auditLogService } from '../../services/AuditLogService';
import { Job, SyncStatus } from '../../types';
import { IToolProvider, ToolManifest } from '../../types';
import { createId } from '../../utils/id';
import { RemoteAdapter } from './RemoteAdapter';

interface QueueItem extends Job {
    id: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    error?: string;
}

/**
 * Provides synchronization-related tools to the agentic system,
 * allowing the AI to trigger push, pull, and status check operations.
 */
export class SyncProvider implements IToolProvider {
    private queue: QueueItem[] = [];
    private running = false;
    private lastSyncedAt?: number;

    constructor(private readonly store: IndexStore = indexStore, private readonly adapter?: RemoteAdapter) {}

    getManifest(): ToolManifest[] {
        return [
            {
                toolId: 'sync_get_status',
                description: 'Returns the status of the synchronization queue.',
                argsSchema: {},
            },
            {
                toolId: 'sync_queue_push',
                description: 'Queues a file to be pushed to the remote adapter.',
                argsSchema: {
                    path: { type: 'string', description: 'Path of the file to upload.', required: true },
                    hash: { type: 'string', description: 'Content hash used for conflict detection.', required: false },
                    remoteId: { type: 'string', description: 'Existing remote identifier, if known.' },
                },
            },
            {
                toolId: 'sync_queue_pull',
                description: 'Fetches remote changes newer than the provided ISO timestamp.',
                argsSchema: {
                    since: { type: 'string', description: 'ISO timestamp. Defaults to last sync time.' },
                },
            },
        ];
    }

    async execute(toolId: string, args: Record<string, any>): Promise<any> {
        switch (toolId) {
            case 'sync_get_status':
                return this.getStatus();
            case 'sync_queue_push':
                return this.enqueuePush(args.path, args.hash, args.remoteId);
            case 'sync_queue_pull':
                return this.pullRemoteChanges(args.since);
            default:
                throw new Error(`Tool "${toolId}" not found in SyncProvider.`);
        }
    }

    private getStatus(): SyncStatus {
        return {
            queued: this.queue.filter((item) => item.status === 'queued' || item.status === 'running').length,
            running: this.running,
            lastSyncedAt: this.lastSyncedAt,
        };
    }

    private async enqueuePush(path: string, hash?: string, remoteId?: string): Promise<{ job: QueueItem; status: SyncStatus }> {
        if (!path) {
            throw new Error('sync_queue_push requires a "path" argument.');
        }

        const job: QueueItem = {
            id: createId('job'),
            op: 'up',
            path,
            hash,
            remoteId,
            status: 'queued',
        };

        this.queue.push(job);
        this.processQueue().catch((error) => {
            auditLogService.error('Failed processing sync queue', { error: String(error) });
        });

        return { job, status: this.getStatus() };
    }

    private async pullRemoteChanges(since?: string): Promise<{ changes: any[]; status: SyncStatus }> {
        const effectiveSince = since ?? (this.lastSyncedAt ? new Date(this.lastSyncedAt).toISOString() : new Date(0).toISOString());
        const changes = this.adapter ? await this.adapter.pull(effectiveSince) : [];
        if (changes.length > 0) {
            this.lastSyncedAt = Date.now();
        }
        return { changes, status: this.getStatus() };
    }

    private async processQueue(): Promise<void> {
        if (this.running) {
            return;
        }
        this.running = true;

        try {
            for (const item of this.queue) {
                if (item.status !== 'queued') {
                    continue;
                }
                item.status = 'running';
                try {
                    await this.processJob(item);
                    item.status = 'completed';
                } catch (error) {
                    item.status = 'failed';
                    item.error = error instanceof Error ? error.message : String(error);
                    auditLogService.error('Sync job failed', { jobId: item.id, error: item.error });
                }
            }
        } finally {
            this.running = false;
            this.lastSyncedAt = Date.now();
            this.queue = this.queue.filter((item) => item.status !== 'completed');
        }
    }

    private async processJob(job: QueueItem): Promise<void> {
        if (job.op === 'up') {
            const meta = this.store.get(job.path);
            const payload = {
                path: job.path,
                hash: job.hash ?? meta?.etag ?? meta?.remoteId,
                remoteId: job.remoteId ?? meta?.remoteId,
            };
            if (this.adapter) {
                await this.adapter.push(payload);
            }
        } else if (job.op === 'down') {
            if (this.adapter) {
                await this.adapter.pull(new Date(this.lastSyncedAt ?? 0).toISOString());
            }
        } else if (job.op === 'del') {
            if (this.adapter) {
                await this.adapter.push({ path: job.path, op: 'del' });
            }
            this.store.remove(job.path);
        }
    }
}
