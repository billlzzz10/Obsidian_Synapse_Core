// src/services/AuditLogService.ts

import { createId } from '../utils/id';

export type AuditLogLevel = 'info' | 'warn' | 'error';

export interface AuditLogEntry {
    id: string;
    timestamp: number;
    level: AuditLogLevel;
    message: string;
    context?: Record<string, unknown>;
}

/**
 * Provides a persistent, append-only log of all actions taken by the agents.
 * This is critical for transparency and debugging.
 */
export class AuditLogService {
    private entries: AuditLogEntry[] = [];

    log(level: AuditLogLevel, message: string, context?: Record<string, unknown>): AuditLogEntry {
        const entry: AuditLogEntry = {
            id: createId('audit'),
            timestamp: Date.now(),
            level,
            message,
            context,
        };
        this.entries.push(entry);
        return entry;
    }

    info(message: string, context?: Record<string, unknown>): AuditLogEntry {
        return this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, unknown>): AuditLogEntry {
        return this.log('warn', message, context);
    }

    error(message: string, context?: Record<string, unknown>): AuditLogEntry {
        return this.log('error', message, context);
    }

    getEntries(): ReadonlyArray<AuditLogEntry> {
        return this.entries;
    }

    getRecent(count: number): AuditLogEntry[] {
        return this.entries.slice(-count);
    }

    clear(): void {
        this.entries = [];
    }
}

export const auditLogService = new AuditLogService();
