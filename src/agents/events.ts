// src/agents/events.ts

import { ExecutionPlan, ExecutionStep } from '../types';

export const USER_COMMAND_EVENT = 'blinknote:user-command';
export const PLAN_CREATED_EVENT = 'blinknote:plan-created';
export const EXECUTION_RESULT_EVENT = 'blinknote:execution-result';

export interface UserCommandPayload {
    command: string;
    metadata?: Record<string, any>;
}

export type PlanCreatedPayload = ExecutionPlan;

export interface ExecutionResultPayload {
    planId: string;
    step: ExecutionStep;
    result?: unknown;
    error?: string;
}
