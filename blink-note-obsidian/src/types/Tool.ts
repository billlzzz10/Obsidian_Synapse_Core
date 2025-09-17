// src/types/Tool.ts

/**
 * Defines the schema for a tool's arguments, which can be used for validation and UI generation.
 */
export interface ToolArgumentSchema {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required?: boolean;
    items?: ToolArgumentSchema; // For arrays
}

/**
 * Defines the manifest for a single tool that can be executed.
 */
export interface ToolManifest {
    toolId: string;
    description: string;
    argsSchema: Record<string, ToolArgumentSchema>;
}

/**
 * Defines the interface for a Tool Provider, which groups a set of related tools.
 */
export interface IToolProvider {
    getManifest(): ToolManifest[];
    execute(toolId: string, args: Record<string, any>): Promise<any>;
}
