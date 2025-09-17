// src/types/Agent.ts

/**
 * Defines the interface for an Agent, which can be either a Planner or an Executor.
 */
export interface IAgent {
    // Method to initialize the agent, subscribing to relevant events.
    initialize(): void;

    // Optional method to clean up resources.
    dispose?(): void;
}
