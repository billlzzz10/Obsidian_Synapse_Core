// src/tools/ToolRegistry.ts

import { IToolProvider, ToolManifest } from '../types';

interface RegisteredTool {
    manifest: ToolManifest;
    provider: IToolProvider;
}

/**
 * A central registry for all available tools from all providers.
 * The PlannerAgent uses this to get a manifest of available tools,
 * and the ExecutorAgent uses this to execute a specific tool.
 */
export class ToolRegistry {
    private providers = new Set<IToolProvider>();
    private tools = new Map<string, RegisteredTool>();

    register(provider: IToolProvider): void {
        if (this.providers.has(provider)) {
            return;
        }

        const manifest = provider.getManifest();
        manifest.forEach((tool) => {
            if (this.tools.has(tool.toolId)) {
                throw new Error(`Tool with id "${tool.toolId}" is already registered.`);
            }
            this.tools.set(tool.toolId, { manifest: tool, provider });
        });

        this.providers.add(provider);
    }

    unregister(provider: IToolProvider): void {
        if (!this.providers.delete(provider)) {
            return;
        }

        for (const [toolId, entry] of Array.from(this.tools.entries())) {
            if (entry.provider === provider) {
                this.tools.delete(toolId);
            }
        }
    }

    hasTool(toolId: string): boolean {
        return this.tools.has(toolId);
    }

    getManifest(): ToolManifest[] {
        return Array.from(this.tools.values()).map((entry) => entry.manifest);
    }

    getTool(toolId: string): ToolManifest | undefined {
        return this.tools.get(toolId)?.manifest;
    }

    listProviders(): IToolProvider[] {
        return Array.from(this.providers);
    }

    async execute(toolId: string, args: Record<string, any>): Promise<any> {
        const entry = this.tools.get(toolId);
        if (!entry) {
            throw new Error(`Tool "${toolId}" is not registered.`);
        }
        return entry.provider.execute(toolId, args);
    }
}
