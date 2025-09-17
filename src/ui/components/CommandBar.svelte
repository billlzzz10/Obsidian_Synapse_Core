<!-- src/ui/components/CommandBar.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import MagicWandIcon from './icons/MagicWandIcon.svelte';

    export let disabled = false;
    let commandText = '';
    const dispatch = createEventDispatcher();

    function handleSubmit() {
        if (commandText.trim() && !disabled) {
            dispatch('submit', { command: commandText });
            commandText = '';
        }
    }

    function handleMagicWandClick() {
        // ในสถานการณ์จริง: จะเรียก AI มาช่วยขัดเกลา Prompt
        alert('Magic Wand clicked! This will refine the prompt in the future.');
    }
</script>

<div class="command-bar-wrapper">
    <button class="icon-button" on:click={handleMagicWandClick} title="Refine command" disabled={!commandText || disabled}>
        <MagicWandIcon />
    </button>
    <input
        class="command-input"
        type="text"
        bind:value={commandText}
        on:keydown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="เช่น 'สรุปไฟล์ล่าสุดแล้วสร้าง task ใน ClickUp'..."
        {disabled}
    />
    <button class="send-button" on:click={handleSubmit} {disabled}>Send</button>
</div>

<style>
    .command-bar-wrapper { display: flex; gap: 8px; align-items: center; }
    .command-input {
        flex-grow: 1;
        background-color: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        padding: 8px;
        border-radius: 4px;
    }
    .icon-button, .send-button {
        background-color: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
    }
    .send-button { padding: 6px 12px; }
    :disabled { opacity: 0.5; cursor: not-allowed; }
</style>
