<!-- src/ui/components/ExecutionCard.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let result; // { plan, stepStatus, isComplete, jobName }
    const dispatch = createEventDispatcher();

    // คำนวณความคืบหน้าสำหรับ Progress Bar
    $: completedSteps = result.stepStatus.filter(s => s.status === 'success').length;
    $: totalSteps = result.plan.steps.length;
    $: progressPercentage = (completedSteps / totalSteps) * 100;

    function handleReview() {
        dispatch('review', { executionResult: result });
    }

    function handleClose() {
        dispatch('close');
    }
</script>

<div class="execution-card">
    <header class="card-header">
        {#if !result.isComplete}
            <h4>⏳ กำลังทำงาน...</h4>
        {:else if result.stepStatus.some(s => s.status === 'error')}
            <h4>❌ เกิดข้อผิดพลาดในงาน "{result.jobName}"</h4>
        {:else}
            <h4>✅ งาน "{result.jobName}" เสร็จสมบูรณ์</h4>
        {/if}
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: {progressPercentage}%"></div>
        </div>
    </header>

    <ul class="step-list">
        {#each result.plan.steps as step, i}
            <li class="step-item status-{result.stepStatus[i].status}">
                <span class="status-icon">
                    {#if result.stepStatus[i].status === 'pending'}⏳
                    {:else if result.stepStatus[i].status === 'success'}✅
                    {:else if result.stepStatus[i].status === 'error'}❌
                    {/if}
                </span>
                <div class="step-details">
                    <span class="step-task">{step.task}</span>
                    {#if result.stepStatus[i].status === 'error' && result.stepStatus[i].errorMessage}
                        <span class="error-message">{result.stepStatus[i].errorMessage}</span>
                    {/if}
                </div>
            </li>
        {/each}
    </ul>

    {#if result.isComplete}
        <footer class="final-review-footer">
            <p>การทำงานสิ้นสุดลงแล้ว</p>
            <div class="action-buttons">
                <button class="secondary-button" on:click={handleClose}>ปิด</button>
                <button class="primary-button" on:click={handleReview}>ดูการเปลี่ยนแปลง</button>
            </div>
        </footer>
    {/if}
</div>

<style>
    .execution-card {
        border: 1px solid var(--background-modifier-border);
        padding: 16px;
        border-radius: 8px;
        background-color: var(--background-secondary);
    }
    .card-header { margin-bottom: 16px; }
    .progress-bar-container {
        width: 100%;
        background-color: var(--background-modifier-border);
        height: 4px;
        border-radius: 2px;
        margin-top: 8px;
        overflow: hidden;
    }
    .progress-bar {
        height: 100%;
        background-color: var(--interactive-accent);
        transition: width 0.5s ease-in-out;
    }
    .step-list { list-style: none; padding: 0; margin: 16px 0; }
    .step-item { display: flex; gap: 8px; margin-bottom: 12px; }
    .step-details { display: flex; flex-direction: column; }
    .error-message {
        font-size: 0.9em;
        color: var(--text-error);
        margin-top: 4px;
    }
    .final-review-footer {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--background-modifier-border);
        text-align: center;
    }
    .action-buttons { margin-top: 12px; display: flex; justify-content: center; gap: 12px; }
    .status-success { color: var(--text-normal); }
    .status-error .step-task { text-decoration: line-through; color: var(--text-muted); }
    .status-pending { color: var(--text-muted); }
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
