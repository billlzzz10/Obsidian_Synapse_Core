// src/settings/SyncSettings.ts

/**
 * Defines the structure for synchronization settings and provides default values.
 * This will be used by the SettingTab to render the UI for sync configuration.
 */

export interface SyncConfig {
  enabled: boolean;
  backend: 'webdav'|'s3'|'custom';
  webdav?: { baseUrl:string; user:string; pass:string };
  s3?: { bucket:string; region:string; accessKeyId:string; secretAccessKey:string };
  include: string[];           // globs
  exclude: string[];           // globs
  mode: 'two-way'|'local-only'|'remote-only';
  debounceMs: number;          // 300–1000
  concurrency: number;         // 2–6 desktop, 1–2 mobile
  chunkSize: number;           // MB
  bandwidthCapMbps?: number;
  security: { encryptTokens: boolean };
}

export const defaultSyncConfig: SyncConfig = {
  enabled: true, backend:'webdav',
  include:['**/*.md','assets/**'], exclude:['.obsidian/**','**/*.tmp'],
  mode:'two-way', debounceMs:500, concurrency:3, chunkSize:8,
  security:{ encryptTokens:true }
};
