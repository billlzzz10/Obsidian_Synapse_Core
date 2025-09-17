// src/tools/providers/WebDAVAdapter.ts

import { createId } from '../../utils/id';
import { RemoteAdapter } from './RemoteAdapter';

interface WebDavResource {
    path: string;
    content: string;
    etag: string;
    lastModified: number;
}

/**
 * An implementation of the RemoteAdapter for interacting with a WebDAV server.
 * Uses an in-memory representation which mirrors WebDAV semantics closely enough
 * for local development.
 */
export class WebDAVAdapter implements RemoteAdapter {
    private resources = new Map<string, WebDavResource>();

    constructor(private readonly endpoint: string = 'https://webdav.local') {}

    async pull(since: string): Promise<WebDavResource[]> {
        const sinceTime = since ? new Date(since).getTime() : 0;
        return Array.from(this.resources.values()).filter((resource) => resource.lastModified > sinceTime);
    }

    async push(change: any): Promise<WebDavResource | { deleted: boolean; path: string }> {
        const resourcePath = String(change.path ?? '');
        if (!resourcePath) {
            throw new Error('WebDAVAdapter.push requires a "path" property.');
        }
        if (change.op === 'del') {
            this.resources.delete(resourcePath);
            return { deleted: true, path: resourcePath };
        }

        const content = typeof change.content === 'string' ? change.content : JSON.stringify(change.content ?? {});
        const entry: WebDavResource = {
            path: resourcePath,
            content,
            etag: createId('etag'),
            lastModified: Date.now(),
        };
        this.resources.set(resourcePath, entry);
        return entry;
    }

    async stat(pathOrId: string): Promise<WebDavResource | null> {
        return this.resources.get(pathOrId) ?? null;
    }
}
