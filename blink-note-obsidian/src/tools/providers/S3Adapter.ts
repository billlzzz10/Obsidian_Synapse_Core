// src/tools/providers/S3Adapter.ts

import { createId } from '../../utils/id';
import { RemoteAdapter } from './RemoteAdapter';

interface S3ObjectEntry {
    key: string;
    content: string;
    etag: string;
    lastModified: number;
}

/**
 * An implementation of the RemoteAdapter for interacting with an S3-compatible object storage.
 * This adapter keeps an in-memory representation that mimics the behaviour of S3 which makes it
 * suitable for unit tests without requiring network credentials.
 */
export class S3Adapter implements RemoteAdapter {
    private objects = new Map<string, S3ObjectEntry>();

    constructor(private readonly bucket: string = 'blink-note') {}

    async pull(since: string): Promise<S3ObjectEntry[]> {
        const sinceTime = since ? new Date(since).getTime() : 0;
        return Array.from(this.objects.values()).filter((object) => object.lastModified > sinceTime);
    }

    async push(change: any): Promise<S3ObjectEntry | { deleted: boolean; key: string }> {
        const key = String(change.path ?? change.key ?? '');
        if (!key) {
            throw new Error('S3Adapter.push requires a "path" or "key" property.');
        }
        if (change.op === 'del') {
            this.objects.delete(key);
            return { deleted: true, key };
        }

        const content = typeof change.content === 'string' ? change.content : JSON.stringify(change.content ?? {});
        const entry: S3ObjectEntry = {
            key,
            content,
            etag: createId('etag'),
            lastModified: Date.now(),
        };
        this.objects.set(key, entry);
        return entry;
    }

    async stat(pathOrId: string): Promise<S3ObjectEntry | null> {
        return this.objects.get(pathOrId) ?? null;
    }
}
