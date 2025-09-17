import { IToolProvider, ToolManifest } from '../../types';
import { createId } from '../../utils/id';

// Data Structures
interface ClickUpUser {
    id: string;
    username: string;
    email: string;
}

interface ClickUpWorkspace {
    id: string;
    name: string;
}

interface ClickUpSpace {
    id: string;
    name: string;
}

interface ClickUpFolder {
    id: string;
    name: string;
    spaceId: string;
}

interface ClickUpList {
    id: string;
    name: string;
    folderId: string;
}

interface ClickUpTask {
    id: string;
    name: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'done';
    listId: string;
    url: string;
    createdAt: number;
}

export class ClickUpProvider implements IToolProvider {
    private user: ClickUpUser = { id: 'user-1', username: 'Test User', email: 'test@user.com' };
    private workspaces = new Map<string, ClickUpWorkspace>([['ws-1', { id: 'ws-1', name: 'Test Workspace' }]]);
    private spaces = new Map<string, ClickUpSpace>();
    private folders = new Map<string, ClickUpFolder>();
    private lists = new Map<string, ClickUpList>();
    private tasks = new Map<string, ClickUpTask>();

    constructor(private readonly workspaceSlug: string = 'workspace') {}

    getManifest(): ToolManifest[] {
        return [
            // User
            { toolId: 'clickup_get_authorized_user', description: 'Get the authorized user', argsSchema: {} },
            // Workspaces
            { toolId: 'clickup_get_authorized_teams', description: 'Get authorized workspaces', argsSchema: {} },
            // Spaces
            { toolId: 'clickup_create_space', description: 'Create a new space', argsSchema: { workspaceId: { type: 'string', required: true }, name: { type: 'string', required: true } } },
            { toolId: 'clickup_get_spaces', description: 'Get spaces in a workspace', argsSchema: { workspaceId: { type: 'string', required: true } } },
            { toolId: 'clickup_get_space', description: 'Get a space by ID', argsSchema: { spaceId: { type: 'string', required: true } } },
            { toolId: 'clickup_update_space', description: 'Update a space', argsSchema: { spaceId: { type: 'string', required: true }, name: { type: 'string', required: true } } },
            { toolId: 'clickup_delete_space', description: 'Delete a space', argsSchema: { spaceId: { type: 'string', required: true } } },
            // Folders
            { toolId: 'clickup_create_folder', description: 'Create a new folder in a space', argsSchema: { spaceId: { type: 'string', required: true }, name: { type: 'string', required: true } } },
            { toolId: 'clickup_get_folders', description: 'Get folders in a space', argsSchema: { spaceId: { type: 'string', required: true } } },
            { toolId: 'clickup_update_folder', description: 'Update a folder', argsSchema: { folderId: { type: 'string', required: true }, name: { type: 'string', required: true } } },
            { toolId: 'clickup_delete_folder', description: 'Delete a folder', argsSchema: { folderId: { type: 'string', required: true } } },
            // Lists
            { toolId: 'clickup_create_list', description: 'Create a new list in a folder', argsSchema: { folderId: { type: 'string', required: true }, name: { type: 'string', required: true } } },
            { toolId: 'clickup_get_lists', description: 'Get lists in a folder', argsSchema: { folderId: { type: 'string', required: true } } },
            { toolId: 'clickup_get_list', description: 'Get a list by ID', argsSchema: { listId: { type: 'string', required: true } } },
            { toolId: 'clickup_update_list', description: 'Update a list', argsSchema: { listId: { type: 'string', required: true }, name: { type: 'string', required: true } } },
            { toolId: 'clickup_delete_list', description: 'Delete a list', argsSchema: { listId: { type: 'string', required: true } } },
            // Tasks
            { toolId: 'clickup_create_task_in_list', description: 'Create a new task in a list', argsSchema: { listId: { type: 'string', required: true }, name: { type: 'string', required: true }, description: { type: 'string' } } },
            { toolId: 'clickup_get_tasks_in_list', description: 'Get tasks in a list', argsSchema: { listId: { type: 'string', required: true } } },
            { toolId: 'clickup_get_task', description: 'Get a task by ID', argsSchema: { taskId: { type: 'string', required: true } } },
            { toolId: 'clickup_update_task', description: 'Update a task', argsSchema: { taskId: { type: 'string', required: true }, name: { type: 'string' }, description: { type: 'string' } } },
            { toolId: 'clickup_delete_task', description: 'Delete a task', argsSchema: { taskId: { type: 'string', required: true } } },
        ];
    }

    async execute(toolId: string, args: Record<string, any>): Promise<any> {
        switch (toolId) {
            // User
            case 'clickup_get_authorized_user': return this.user;
            // Workspaces
            case 'clickup_get_authorized_teams': return Array.from(this.workspaces.values());
            // Spaces
            case 'clickup_create_space': return this.createSpace(String(args.workspaceId), String(args.name));
            case 'clickup_get_spaces': return this.getSpaces(String(args.workspaceId));
            case 'clickup_get_space': return this.spaces.get(String(args.spaceId));
            case 'clickup_update_space': return this.updateSpace(String(args.spaceId), String(args.name));
            case 'clickup_delete_space': this.spaces.delete(String(args.spaceId)); return { success: true };
            // Folders
            case 'clickup_create_folder': return this.createFolder(String(args.spaceId), String(args.name));
            case 'clickup_get_folders': return this.getFolders(String(args.spaceId));
            case 'clickup_update_folder': return this.updateFolder(String(args.folderId), String(args.name));
            case 'clickup_delete_folder': this.folders.delete(String(args.folderId)); return { success: true };
            // Lists
            case 'clickup_create_list': return this.createList(String(args.folderId), String(args.name));
            case 'clickup_get_lists': return this.getLists(String(args.folderId));
            case 'clickup_get_list': return this.lists.get(String(args.listId));
            case 'clickup_update_list': return this.updateList(String(args.listId), String(args.name));
            case 'clickup_delete_list': this.lists.delete(String(args.listId)); return { success: true };
            // Tasks
            case 'clickup_create_task_in_list': return this.createTask(String(args.listId), String(args.name), args.description ? String(args.description) : undefined);
            case 'clickup_get_tasks_in_list': return this.getTasks(String(args.listId));
            case 'clickup_get_task': return this.tasks.get(String(args.taskId));
            case 'clickup_update_task': return this.updateTask(String(args.taskId), args.name ? String(args.name) : undefined, args.description ? String(args.description) : undefined);
            case 'clickup_delete_task': this.tasks.delete(String(args.taskId)); return { success: true };
            default:
                throw new Error(`Tool "${toolId}" not found in ClickUpProvider.`);
        }
    }

    // Helper methods
    private createSpace(workspaceId: string, name: string): ClickUpSpace {
        const id = createId('space');
        const space: ClickUpSpace = { id, name };
        this.spaces.set(id, space);
        return space;
    }

    private getSpaces(workspaceId: string): ClickUpSpace[] {
        return Array.from(this.spaces.values());
    }

    private updateSpace(spaceId: string, name: string): ClickUpSpace {
        const space = this.spaces.get(spaceId);
        if (!space) throw new Error('Space not found');
        space.name = name;
        return space;
    }

    private createFolder(spaceId: string, name: string): ClickUpFolder {
        const id = createId('folder');
        const folder: ClickUpFolder = { id, name, spaceId };
        this.folders.set(id, folder);
        return folder;
    }

    private getFolders(spaceId: string): ClickUpFolder[] {
        return Array.from(this.folders.values()).filter(f => f.spaceId === spaceId);
    }

    private updateFolder(folderId: string, name: string): ClickUpFolder {
        const folder = this.folders.get(folderId);
        if (!folder) throw new Error('Folder not found');
        folder.name = name;
        return folder;
    }

    private createList(folderId: string, name: string): ClickUpList {
        const id = createId('list');
        const list: ClickUpList = { id, name, folderId };
        this.lists.set(id, list);
        return list;
    }

    private getLists(folderId: string): ClickUpList[] {
        return Array.from(this.lists.values()).filter(l => l.folderId === folderId);
    }

    private updateList(listId: string, name: string): ClickUpList {
        const list = this.lists.get(listId);
        if (!list) throw new Error('List not found');
        list.name = name;
        return list;
    }

    private createTask(listId: string, name: string, description?: string): ClickUpTask {
        const id = createId('task');
        const task: ClickUpTask = {
            id, name, description, listId,
            status: 'todo',
            url: `https://app.clickup.com/${this.workspaceSlug}/task/${id}`,
            createdAt: Date.now(),
        };
        this.tasks.set(id, task);
        return task;
    }

    private getTasks(listId: string): ClickUpTask[] {
        return Array.from(this.tasks.values()).filter(t => t.listId === listId);
    }

    private updateTask(taskId: string, name?: string, description?: string): ClickUpTask {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error('Task not found');
        if (name) task.name = name;
        if (description) task.description = description;
        return task;
    }
}

