// src/agents/ExecutorAgent.ts

import { eventBus, EventBus } from '../services/EventBus';
import { SessionMemory } from '../services/SessionMemory';
import { AuditLogService } from '../services/AuditLogService';
import { ExecutionPlan, ExecutionStep } from '../types';
import { IAgent } from '../types/Agent';
import { ToolRegistry } from '../tools/ToolRegistry';
import { EXECUTION_RESULT_EVENT, PLAN_CREATED_EVENT } from './events';

interface ExecutorAgentDependencies {
    eventBus?: EventBus;
    sessionMemory: SessionMemory;
    auditLog: AuditLogService;
    toolRegistry: ToolRegistry;
}

/**
 * The ExecutorAgent executes each step of a plan by invoking the ToolRegistry
 * and publishing the results back on the event bus.
 */
export class ExecutorAgent implements IAgent {
    private readonly bus: EventBus;
    private unsubscribe?: () => void;

    constructor(private readonly deps: ExecutorAgentDependencies) {
        this.bus = deps.eventBus ?? eventBus;
    }

    initialize(): void {
        this.unsubscribe = this.bus.subscribe<ExecutionPlan>(PLAN_CREATED_EVENT, (plan) => {
            void this.executePlan(plan);
        });
    }

    dispose(): void {
        this.unsubscribe?.();
    }

    private async executePlan(plan: ExecutionPlan): Promise<void> {
        for (const step of plan.steps) {
            const shouldContinue = await this.executeStep(plan.planId, step);
            if (!shouldContinue) {
                break;
            }
        }
    }

    private async executeStep(planId: string, step: ExecutionStep): Promise<boolean> {
        try {
            this.deps.auditLog.info('Executing plan step', { planId, step: step.step, toolId: step.toolId });
            const result = await this.deps.toolRegistry.execute(step.toolId, step.args);
            this.deps.sessionMemory.recordExecutionResult(planId, step, result);
            this.bus.publish(EXECUTION_RESULT_EVENT, { planId, step, result });
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.deps.auditLog.error('Plan step failed', { planId, step: step.step, toolId: step.toolId, error: message });
            this.deps.sessionMemory.recordExecutionResult(planId, step, undefined, message);
            this.bus.publish(EXECUTION_RESULT_EVENT, { planId, step, error: message });
            return false;
        }
    }
}
