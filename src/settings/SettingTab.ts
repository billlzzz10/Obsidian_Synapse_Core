// src/settings/SettingTab.ts

import { App, PluginSettingTab, Setting } from 'obsidian';
import BlinkNotePlugin from '../main';

export class SettingTab extends PluginSettingTab {
    plugin: BlinkNotePlugin;

    constructor(app: App, plugin: BlinkNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Blink Note Settings' });

        // Settings for LLM Provider, ClickUp, etc. will go here
    }
}
