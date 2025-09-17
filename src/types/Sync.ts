export type FilePath = string;
export type HashHex = string;     // SHA-256 hex
export type ETag = string;

export interface FileMeta {
  path: FilePath; size: number; etag?: ETag; lastModified?: number;
  remoteId?: string;
}

export type JobOp = 'up'|'down'|'del';
export interface Job {
  op: JobOp; path: FilePath; hash?: HashHex; remoteId?: string; attempt?: number;
}

export interface LocalChange {
  path: FilePath;
  baseHash?: HashHex;            // base version used for 3-way merge
  content?: ArrayBuffer;         // omit for delete
  isBinary?: boolean;
}

export type RemoteChangeOp = 'up'|'del'|'rename';
export interface RemoteChange {
  op: RemoteChangeOp;
  path: FilePath; newPath?: FilePath;
  etag?: ETag; remoteId?: string; lastModified?: number; isBinary?: boolean;
  contentUrl?: string;           // optional for lazy pull
}

export interface SyncStatus {
  queued: number; running: boolean; lastSyncedAt?: number;
}

export interface ConflictDetail {
  path: FilePath; base?: string; local?: string; remote?: string;
  isBinary?: boolean;
}
