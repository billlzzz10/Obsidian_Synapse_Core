// src/agents/PlannerAgent.ts

import { eventBus, EventBus } from '../services/EventBus';
import { SessionMemory } from '../services/SessionMemory';
import { AuditLogService } from '../services/AuditLogService';
import { ExecutionPlan, ToolManifest } from '../types';
import { IAgent } from '../types/Agent';
import { ToolRegistry } from '../tools/ToolRegistry';
import { createId } from '../utils/id';
import { PLAN_CREATED_EVENT, USER_COMMAND_EVENT, UserCommandPayload } from './events';

interface PlannerAgentDependencies {
    eventBus?: EventBus;
    sessionMemory: SessionMemory;
    auditLog: AuditLogService;
    toolRegistry: ToolRegistry;
}

/**
 * The PlannerAgent is responsible for taking a user's command
 * and generating a step-by-step execution plan using available tools.
 */
export class PlannerAgent implements IAgent {
    private readonly bus: EventBus;
    private unsubscribe?: () => void;

    constructor(private readonly deps: PlannerAgentDependencies) {
        this.bus = deps.eventBus ?? eventBus;
    }

    initialize(): void {
        this.unsubscribe = this.bus.subscribe<UserCommandPayload>(USER_COMMAND_EVENT, (payload) => {
            void this.handleUserCommand(payload);
        });
    }

    dispose(): void {
        this.unsubscribe?.();
    }

    private async handleUserCommand(payload: UserCommandPayload): Promise<void> {
        this.deps.sessionMemory.recordCommand(payload.command, payload.metadata);
        this.deps.auditLog.info('Received user command', { command: payload.command });

        const plan = this.buildPlan(payload.command, payload.metadata);
        this.deps.sessionMemory.recordPlan(plan);
        this.deps.auditLog.info('Generated execution plan', { planId: plan.planId, steps: plan.steps.length });

        this.bus.publish(PLAN_CREATED_EVENT, plan);
    }

    private buildPlan(command: string, metadata?: Record<string, any>): ExecutionPlan {
        const selectedTools = this.selectTools(command, metadata);
        const steps = selectedTools.reduce<ExecutionPlan['steps']>((acc, tool) => {
            const args = this.buildArgsForTool(tool.toolId, command, metadata);
            if (args === null) {
                return acc;
            }
            acc.push({
                step: acc.length + 1,
                toolId: tool.toolId,
                args,
                description: this.describeStep(tool, command),
            });
            return acc;
        }, []);

        return {
            planId: createId('plan'),
            userCommand: command,
            steps,
        };
    }

    private selectTools(command: string, metadata?: Record<string, any>): ToolManifest[] {
        const manifest = this.deps.toolRegistry.getManifest();
        const byId = new Map(manifest.map((tool) => [tool.toolId, tool]));
        const selected: ToolManifest[] = [];
        const lowerCommand = command.toLowerCase();

        const maybeAdd = (toolId: string, condition: boolean = true) => {
            if (!condition) {
                return;
            }
            const tool = byId.get(toolId);
            if (tool && !selected.includes(tool)) {
                selected.push(tool);
            }
        };

        maybeAdd('sync_get_status', /sync|synchronise|synchronize|upload|download/.test(lowerCommand));
        maybeAdd('sync_queue_push', /upload|push/.test(lowerCommand));
        maybeAdd('sync_queue_pull', /pull|download/.test(lowerCommand));

        maybeAdd('clickup_create_task', /task|clickup|todo/.test(lowerCommand));
        maybeAdd('clickup_get_task', Boolean(metadata?.taskId));

        maybeAdd('context7_resolve_library_id', /doc|documentation|api|library/.test(lowerCommand));
        maybeAdd('context7_get_library_docs', /doc|documentation|api|library/.test(lowerCommand));

        maybeAdd('filesystem_find_file', /file|note|find|search/.test(lowerCommand));
        maybeAdd('filesystem_read_file', Boolean(metadata?.path));
        maybeAdd('filesystem_write_file', Boolean(metadata?.content) || /write|create/.test(lowerCommand));

        if (selected.length === 0 && manifest.length > 0) {
            selected.push(manifest[0]);
        }

        return selected;
    }

    private buildArgsForTool(toolId: string, command: string, metadata?: Record<string, any>): Record<string, any> | null {
        switch (toolId) {
            case 'sync_get_status':
                return {};
            case 'sync_queue_push':
                return metadata?.path ? { path: metadata.path, hash: metadata.hash, remoteId: metadata.remoteId } : null;
            case 'sync_queue_pull':
                return { since: metadata?.since };
            case 'clickup_create_task':
                return {
                    name: metadata?.taskName ?? command,
                    description: metadata?.description,
                    status: metadata?.status ?? 'todo',
                };
            case 'clickup_get_task':
                return metadata?.taskId ? { id: metadata.taskId } : null;
            case 'context7_resolve_library_id':
                return { libraryName: metadata?.libraryName ?? command };
            case 'context7_get_library_docs':
                return {
                    context7CompatibleLibraryID: metadata?.context7CompatibleLibraryID ?? '/mock/library/docs',
                    topic: metadata?.topic,
                    tokens: metadata?.tokens,
                };
            case 'filesystem_find_file':
                return { query: metadata?.query ?? command, limit: metadata?.limit ?? 20 };
            case 'filesystem_read_file':
                return metadata?.path ? { path: metadata.path, encoding: metadata?.encoding ?? 'utf-8' } : null;
            case 'filesystem_write_file':
                if (!metadata?.path || typeof metadata.content !== 'string') {
                    return null;
                }
                return {
                    path: metadata.path,
                    content: metadata.content,
                    encoding: metadata?.encoding ?? 'utf-8',
                };
            default:
                return metadata?.[toolId] ?? {};
        }
    }

    private describeStep(tool: ToolManifest, command: string): string {
        return tool.description || `Run ${tool.toolId} for command "${command}"`;
    }
}
