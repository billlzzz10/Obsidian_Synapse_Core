// src/services/SessionMemory.ts

import { ExecutionPlan, ExecutionStep } from '../types';
import { createId } from '../utils/id';

export type SessionEntry =
    | {
          type: 'command';
          id: string;
          timestamp: number;
          command: string;
          metadata?: Record<string, any>;
      }
    | {
          type: 'plan';
          id: string;
          timestamp: number;
          plan: ExecutionPlan;
      }
    | {
          type: 'execution';
          id: string;
          timestamp: number;
          planId: string;
          step: ExecutionStep;
          result?: unknown;
          error?: string;
      };

/**
 * Stores the history of the current user session, including commands,
 * plans, and execution results. This provides context for the PlannerAgent.
 */
export class SessionMemory {
    private history: SessionEntry[] = [];

    recordCommand(command: string, metadata?: Record<string, any>): SessionEntry {
        const entry: SessionEntry = {
            type: 'command',
            id: createId('command'),
            timestamp: Date.now(),
            command,
            metadata,
        };
        this.history.push(entry);
        return entry;
    }

    recordPlan(plan: ExecutionPlan): SessionEntry {
        const entry: SessionEntry = {
            type: 'plan',
            id: createId('plan'),
            timestamp: Date.now(),
            plan,
        };
        this.history.push(entry);
        return entry;
    }

    recordExecutionResult(planId: string, step: ExecutionStep, result?: unknown, error?: string): SessionEntry {
        const entry: SessionEntry = {
            type: 'execution',
            id: createId('exec'),
            timestamp: Date.now(),
            planId,
            step,
            result,
            error,
        };
        this.history.push(entry);
        return entry;
    }

    getHistory(): ReadonlyArray<SessionEntry> {
        return this.history;
    }

    getLastPlan(): ExecutionPlan | undefined {
        for (let i = this.history.length - 1; i >= 0; i--) {
            const entry = this.history[i];
            if (entry.type === 'plan') {
                return entry.plan;
            }
        }
        return undefined;
    }

    clear(): void {
        this.history = [];
    }
}

export const sessionMemory = new SessionMemory();
