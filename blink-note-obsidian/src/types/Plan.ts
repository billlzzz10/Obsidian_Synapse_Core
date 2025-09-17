// src/types/Plan.ts

/**
 * Defines a single step in an execution plan.
 */
export interface ExecutionStep {
    step: number;
    toolId: string;
    args: Record<string, any>;
    description: string;
}

/**
 * Defines the structure of an execution plan created by the PlannerAgent.
 */
export interface ExecutionPlan {
    planId: string;
    userCommand: string;
    steps: ExecutionStep[];
}
