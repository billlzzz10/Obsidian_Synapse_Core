<!-- src/ui/components/PlanningCard.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let plan;
    const dispatch = createEventDispatcher();

    function showCodeSnippet(step) {
        alert(`Showing code snippet for: ${step.task}`);
    }
</script>

<div class="planning-card">
    <h4>แผนการทำงาน</h4>
    <p>AI ได้วางแผนที่จะทำงานตามขั้นตอนต่อไปนี้ โปรดตรวจสอบและอนุมัติ</p>

    <ul class="step-list">
        {#each plan.steps as step}
            <li class="step-item">
                <span class="step-number">{step.step}.</span>
                <span class="step-task">{step.task}</span>
                {#if step.requiresCode}
                    <button class="code-snippet-button" on:click={() => showCodeSnippet(step)} title="ดูตัวอย่างโค้ด">
                        &lt;/&gt;
                    </button>
                {/if}
            </li>
        {/each}
    </ul>

    <div class="action-buttons">
        <button class="secondary-button" on:click={() => dispatch('reject')}>ปฏิเสธ</button>
        <button class="primary-button" on:click={() => dispatch('approve', { planId: plan.planId })}>อนุมัติแผน</button>
    </div>
</div>

<style>
    .planning-card {
        border: 1px solid var(--background-modifier-border);
        padding: 16px;
        border-radius: 8px;
        background-color: var(--background-secondary);
    }
    .step-list { list-style: none; padding: 0; margin: 16px 0; }
    .step-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .step-number { color: var(--text-muted); }
    .code-snippet-button {
        background: none;
        border: 1px solid var(--background-modifier-border);
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 4px;
        margin-left: auto;
    }
    .action-buttons { margin-top: 16px; display: flex; justify-content: flex-end; gap: 12px; }
    .primary-button {
        background-color: var(--interactive-accent);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
    }
    .secondary-button {
        background-color: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        color: var(--text-normal);
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
    }
</style>
