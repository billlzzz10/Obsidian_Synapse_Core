// src/agents/index.ts

import { eventBus } from '../services/EventBus';
import { auditLogService, AuditLogService } from '../services/AuditLogService';
import { sessionMemory, SessionMemory } from '../services/SessionMemory';
import { PlannerAgent } from './PlannerAgent';
import { ExecutorAgent } from './ExecutorAgent';
import { ToolRegistry } from '../tools/ToolRegistry';

export * from './PlannerAgent';
export * from './ExecutorAgent';
export * from './events';

export interface InitializeAgentsOptions {
    toolRegistry: ToolRegistry;
    sessionMemory?: SessionMemory;
    auditLog?: AuditLogService;
}

export interface InitializedAgents {
    planner: PlannerAgent;
    executor: ExecutorAgent;
    dispose(): void;
}

/**
 * Initializes all agents and subscribes them to the event bus.
 */
export function initializeAgents(options: InitializeAgentsOptions): InitializedAgents {
    const memory = options.sessionMemory ?? sessionMemory;
    const auditLog = options.auditLog ?? auditLogService;

    const planner = new PlannerAgent({
        eventBus,
        sessionMemory: memory,
        auditLog,
        toolRegistry: options.toolRegistry,
    });
    const executor = new ExecutorAgent({
        eventBus,
        sessionMemory: memory,
        auditLog,
        toolRegistry: options.toolRegistry,
    });

    planner.initialize();
    executor.initialize();

    return {
        planner,
        executor,
        dispose() {
            planner.dispose();
            executor.dispose();
        },
    };
}
