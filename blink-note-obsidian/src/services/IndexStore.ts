// src/services/IndexStore.ts

import { FileMeta, FilePath } from '../types';

export interface IndexDiff {
    added: FileMeta[];
    removed: FileMeta[];
    updated: FileMeta[];
}

/**
 * Manages the persistent index of file metadata, including hashes and sync status.
 * This is crucial for determining which files have changed and need to be synced.
 */
export class IndexStore {
    private index: Map<FilePath, FileMeta> = new Map();

    load(entries: Iterable<FileMeta>): void {
        for (const entry of entries) {
            this.upsert(entry);
        }
    }

    upsert(meta: FileMeta): void {
        this.index.set(meta.path, { ...this.index.get(meta.path), ...meta });
    }

    remove(path: FilePath): void {
        this.index.delete(path);
    }

    get(path: FilePath): FileMeta | undefined {
        return this.index.get(path);
    }

    list(): FileMeta[] {
        return Array.from(this.index.values());
    }

    has(path: FilePath): boolean {
        return this.index.has(path);
    }

    clear(): void {
        this.index.clear();
    }

    toJSON(): FileMeta[] {
        return this.list();
    }

    /**
     * Compares the in-memory index with a snapshot (e.g., from disk or remote)
     * and returns a diff representing added, removed, and updated entries.
     */
    diffAgainst(snapshot: Iterable<FileMeta>): IndexDiff {
        const added: FileMeta[] = [];
        const removed: FileMeta[] = [];
        const updated: FileMeta[] = [];
        const snapshotMap = new Map<FilePath, FileMeta>();

        for (const entry of snapshot) {
            snapshotMap.set(entry.path, entry);
        }

        for (const [path, meta] of this.index.entries()) {
            const snapshotMeta = snapshotMap.get(path);
            if (!snapshotMeta) {
                added.push(meta);
            } else if (this.isMetaDifferent(meta, snapshotMeta)) {
                updated.push(meta);
            }
            snapshotMap.delete(path);
        }

        for (const remaining of snapshotMap.values()) {
            removed.push(remaining);
        }

        return { added, removed, updated };
    }

    private isMetaDifferent(a: FileMeta, b: FileMeta): boolean {
        return (
            a.size !== b.size ||
            a.etag !== b.etag ||
            a.lastModified !== b.lastModified ||
            a.remoteId !== b.remoteId
        );
    }
}

export const indexStore = new IndexStore();
