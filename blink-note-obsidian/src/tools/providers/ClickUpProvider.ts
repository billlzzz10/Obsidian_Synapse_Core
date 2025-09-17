// src/tools/providers/ClickUpProvider.ts

import { IToolProvider, ToolManifest } from '../../types';
import { createId } from '../../utils/id';

interface ClickUpTask {
    id: string;
    name: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'done';
    url: string;
    createdAt: number;
    customFields?: Record<string, any>;
}

/**
 * Provides tools for interacting with the ClickUp API.
 * The current implementation keeps an in-memory task list which is sufficient
 * for local development and automated testing.
 */
export class ClickUpProvider implements IToolProvider {
    private tasks = new Map<string, ClickUpTask>();

    constructor(private readonly workspaceSlug: string = 'workspace') {}

    getManifest(): ToolManifest[] {
        return [
            {
                toolId: 'clickup_create_task',
                description: 'Creates a lightweight task in the in-memory ClickUp store.',
                argsSchema: {
                    name: { type: 'string', description: 'Title of the task to create.', required: true },
                    description: { type: 'string', description: 'Optional task description.' },
                    status: { type: 'string', description: 'Task status (todo, in_progress, done).' },
                },
            },
            {
                toolId: 'clickup_get_task',
                description: 'Retrieves a task by id from the in-memory ClickUp store.',
                argsSchema: {
                    id: { type: 'string', description: 'Identifier of the task to fetch.', required: true },
                },
            },
        ];
    }

    async execute(toolId: string, args: Record<string, any>): Promise<any> {
        switch (toolId) {
            case 'clickup_create_task':
                return this.createTask(String(args.name), args.description ? String(args.description) : undefined, args.status ? String(args.status) : 'todo');
            case 'clickup_get_task':
                return this.getTask(String(args.id));
            default:
                throw new Error(`Tool "${toolId}" not found in ClickUpProvider.`);
        }
    }

    private createTask(name: string, description?: string, status: string = 'todo'): ClickUpTask {
        if (!name) {
            throw new Error('clickup_create_task requires a "name" argument.');
        }
        if (!['todo', 'in_progress', 'done'].includes(status)) {
            throw new Error('Invalid status. Expected one of todo, in_progress, done.');
        }
        const id = createId('task');
        const task: ClickUpTask = {
            id,
            name,
            description,
            status: status as ClickUpTask['status'],
            url: `https://app.clickup.com/${this.workspaceSlug}/task/${id}`,
            createdAt: Date.now(),
        };
        this.tasks.set(id, task);
        return task;
    }

    private getTask(id: string): ClickUpTask {
        const task = this.tasks.get(id);
        if (!task) {
            throw new Error(`Task with id "${id}" was not found.`);
        }
        return task;
    }
}
