// src/tools/providers/RemoteAdapter.ts

/**
 * Defines the interface for a remote storage backend (e.g., WebDAV, S3).
 * This abstraction allows the SyncEngine to work with different cloud services.
 */
// Full implementation will follow the details in Overview-2.md
export interface RemoteAdapter {
    pull(since: string): Promise<any>;
    push(change: any): Promise<any>;
    stat(pathOrId: string): Promise<any | null>;
}
