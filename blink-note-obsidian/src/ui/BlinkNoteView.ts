// src/ui/BlinkNoteView.ts

import { ItemView, WorkspaceLeaf } from 'obsidian';
import BlinkNoteViewComponent from './BlinkNoteView.svelte';

export const VIEW_TYPE_BLINK_NOTE = 'blink-note-view';

export class BlinkNoteView extends ItemView {
    component: BlinkNoteViewComponent;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_BLINK_NOTE;
    }

    getDisplayText() {
        return 'Blink Note';
    }

    async onOpen() {
        this.component = new BlinkNoteViewComponent({
            target: this.contentEl,
        });
    }

    async onClose() {
        this.component.$destroy();
    }
}
