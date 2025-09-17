<!-- src/ui/components/SyncStatus.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  // This is a placeholder for the real EventBus and tools integration
  const mockEventBus = {
      subscribe: (event, callback) => {
          console.log(`Subscribed to ${event}`);
          // Simulate an update
          setTimeout(() => callback({ queued: 5, running: true, lastSyncedAt: Date.now() - 50000 }), 2000);
          return () => console.log(`Unsubscribed from ${event}`);
      }
  };
  const mockTools = {
      run: (toolId) => alert(`Running tool: ${toolId}`)
  };

  let status = { queued: 0, running: false, lastSyncedAt: undefined };

  onMount(() => {
    const unsubscribe = mockEventBus.subscribe('Sync.Progress', s => status = s);
    return unsubscribe;
  });

  function pull(){ mockTools.run('sync_pull'); }
  function push(){ mockTools.run('sync_push'); }
</script>

<section class="sync-status-widget">
  <h3 class="widget-title">Sync Status</h3>
  <div class="status-grid">
    <span>Status:</span>
    <span>{status.running ? 'Running...' : 'Idle'}</span>
    <span>Queued Jobs:</span>
    <span>{status.queued}</span>
    <span>Last Synced:</span>
    <span>{status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : 'Never'}</span>
  </div>
  <div class="action-buttons">
    <button on:click={pull} disabled={status.running}>Pull Changes</button>
    <button on:click={push} disabled={status.running}>Push Changes</button>
  </div>
</section>

<style>
    .sync-status-widget {
        border: 1px solid var(--background-modifier-border, #444);
        padding: 12px;
        border-radius: 8px;
        background-color: var(--background-secondary, #2f3033);
        color: var(--text-normal, #ececec);
    }
    .widget-title {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 1.1em;
    }
    .status-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px;
        font-size: 0.9em;
    }
    .action-buttons {
        margin-top: 12px;
        display: flex;
        gap: 8px;
    }
    button {
        background-color: var(--interactive-accent, #4e8cff);
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
    }
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>
