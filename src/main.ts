// src/main.ts

import { Plugin } from 'obsidian';
import { eventBus } from './services/EventBus';
import { initializeAgents, InitializedAgents } from './agents';
import { ToolRegistry } from './tools/ToolRegistry';
import { FilesystemProvider } from './tools/providers/FilesystemProvider';
import { ClickUpProvider } from './tools/providers/ClickUpProvider';
import { Context7Provider } from './tools/providers/Context7Provider';
import { SyncProvider } from './tools/providers/SyncProvider';

export default class BlinkNotePlugin extends Plugin {
    toolRegistry: ToolRegistry;
    private agents?: InitializedAgents;

    async onload() {
        console.log('Blink Note Plugin: Loading...');

        // 1. Initialize Core Services & Agents
        this.initializeTools();
        this.agents = initializeAgents({ toolRegistry: this.toolRegistry });

        // 2. Register the custom view for our UI
        // this.registerView(
        //     VIEW_TYPE_BLINK_NOTE,
        //     (leaf) => new BlinkNoteView(leaf)
        // );

        // 3. Add a command to open our view
        this.addRibbonIcon('brain-circuit', 'Open Blink Note', () => {
            this.activateView();
            console.log('Blink Note icon clicked!');
        });

        // 4. Add the settings tab
        // this.addSettingTab(new SettingTab(this.app, this));

        // ตัวอย่างการทดสอบ EventBus
        eventBus.subscribe('test-event', (payload: { message: string }) => {
            console.log('Received test-event with message:', payload.message);
        });

        eventBus.publish('test-event', { message: 'Hello from main.ts!' });

        console.log('Blink Note Plugin: Loaded successfully.');
    }

    async onunload() {
        console.log('Blink Note Plugin: Unloading...');
        this.agents?.dispose();
    }

    initializeTools(): void {
        this.toolRegistry = new ToolRegistry();

        // Register all available tool providers
        this.toolRegistry.register(new FilesystemProvider());
        this.toolRegistry.register(new ClickUpProvider());
        this.toolRegistry.register(new Context7Provider()); // <-- User-requested provider
        this.toolRegistry.register(new SyncProvider());

        console.log('Tool providers registered.');
    }

    async activateView() {
        // โค้ดสำหรับเปิดหน้าต่าง Blink Note (จะถูกพัฒนาต่อไป)
        // this.app.workspace.detachLeavesOfType(VIEW_TYPE_BLINK_NOTE);
        // await this.app.workspace.getRightLeaf(false).setViewState({
        //     type: VIEW_TYPE_BLINK_NOTE,
        //     active: true,
        // });
        // this.app.workspace.revealLeaf(
        //     this.app.workspace.getLeavesOfType(VIEW_TYPE_BLINK_NOTE)
        // );
    }
}
