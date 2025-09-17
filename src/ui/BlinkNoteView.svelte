<!-- src/ui/BlinkNoteView.svelte -->
<script lang="ts">
    import CommandBar from './components/CommandBar.svelte';
    import PlanningCard from './components/PlanningCard.svelte';
    import ExecutionCard from './components/ExecutionCard.svelte';

    // Enum สำหรับจัดการสถานะของ UI
    enum ViewState {
        Idle,       // สถานะเริ่มต้น รอรับคำสั่ง
        Planning,   // กำลังแสดงแผน รอการอนุมัติ
        Executing,  // กำลังทำงาน
        Reviewing,  // กำลังแสดงผลลัพธ์เพื่อตรวจสอบ
    }

    let currentState: ViewState = ViewState.Idle;
    let currentCommand = '';
    let mockPlan = null;
    let mockExecutionResult = null;

    // --- Event Handlers ---

    // เมื่อผู้ใช้ส่งคำสั่งจาก CommandBar
    function handleCommandSubmit(event) {
        currentCommand = event.detail.command;
        console.log("User command:", currentCommand);

        // ในสถานการณ์จริง: ส่วนนี้จะส่ง Event ไปให้ PlannerAgent
        // และรอรับ Plan กลับมาเพื่อแสดงผล
        mockPlan = {
            planId: 'plan-xyz-789',
            steps: [
                { step: 1, task: "Find all files named 'project_review_*.md'", toolId: 'filesystem_find_file', requiresCode: true },
                { step: 2, task: "Read the content of the newest file found", toolId: 'filesystem_read_file' },
                { step: 3, task: "Create a new task in ClickUp with the content", toolId: 'clickup_create_task' }
            ]
        };
        currentState = ViewState.Planning;
    }

    // เมื่อผู้ใช้อนุมัติแผน
    function handlePlanApprove(event) {
        console.log("Plan approved:", event.detail.planId);
        // ในสถานการณ์จริง: จะส่ง Event ไปให้ ExecutorAgent
        currentState = ViewState.Executing;
        simulateExecution(); // เริ่มจำลองการทำงาน
    }

    // เมื่อผู้ใช้กด "ดูการเปลี่ยนแปลง"
    function handleReviewChanges(event) {
        console.log("Reviewing changes for job:", event.detail.executionResult.jobName);
        // เปลี่ยนสถานะเพื่อแสดงหน้า Review
        currentState = ViewState.Reviewing;
    }

    // เมื่อผู้ใช้ปฏิเสธแผน หรือปิดหน้าจอผลลัพธ์
    function handleReset() {
        currentState = ViewState.Idle;
        currentCommand = '';
        mockPlan = null;
        mockExecutionResult = null;
    }

    // ฟังก์ชันจำลองการทำงานของ ExecutorAgent
    function simulateExecution() {
        mockExecutionResult = {
            plan: mockPlan,
            jobName: currentCommand.length > 40 ? currentCommand.substring(0, 40) + '...' : currentCommand,
            stepStatus: [
                { status: 'pending', errorMessage: null },
                { status: 'pending', errorMessage: null },
                { status: 'pending', errorMessage: null }
            ],
            isComplete: false
        };

        // จำลองการทำงานทีละขั้นตอน
        setTimeout(() => {
            mockExecutionResult.stepStatus[0].status = 'success';
            mockExecutionResult = { ...mockExecutionResult }; // บังคับให้ Svelte re-render
        }, 1000);
        setTimeout(() => {
            mockExecutionResult.stepStatus[1].status = 'success';
            mockExecutionResult = { ...mockExecutionResult };
        }, 2500);
        setTimeout(() => {
            mockExecutionResult.stepStatus[2].status = 'error';
            mockExecutionResult.stepStatus[2].errorMessage = 'API Error: Invalid ClickUp list_id provided.';
            mockExecutionResult.isComplete = true;
            mockExecutionResult = { ...mockExecutionResult };
        }, 4000);
    }

</script>

<div class="blink-note-container">
    <header class="blink-note-header">
        <h3>Blink Note</h3>
        <!-- ไอคอนตั้งค่าและอื่นๆ จะอยู่ตรงนี้ -->
    </header>

    <main class="interactive-transcript">
        {#if currentState === ViewState.Idle}
            <div class="welcome-message">
                <p>สวัสดีครับ ให้ผมช่วยทำอะไรวันนี้?</p>
            </div>
        {:else if currentState === ViewState.Planning}
            <PlanningCard plan={mockPlan} on:approve={handlePlanApprove} on:reject={handleReset} />
        {:else if currentState === ViewState.Executing}
            <ExecutionCard result={mockExecutionResult} on:review={handleReviewChanges} on:close={handleReset} />
        {:else if currentState === ViewState.Reviewing}
            <div class="review-view-card">
                <h3>สรุปผลลัพธ์สำหรับงาน: "{mockExecutionResult.jobName}"</h3>
                <p>ส่วนนี้จะแสดง Diff View หรือสรุปการเปลี่ยนแปลงทั้งหมดที่เกิดขึ้น</p>
                <!-- ตัวอย่างการแสดงผลลัพธ์ -->
                <div class="review-content">
                    <strong>ข้อผิดพลาด:</strong> ไม่สามารถสร้าง Task ใน ClickUp ได้เนื่องจาก List ID ไม่ถูกต้อง
                </div>
                <button class="primary-button" on:click={handleReset}>กลับไปหน้าหลัก</button>
            </div>
        {/if}
    </main>

    <footer class="command-bar-area">
        <CommandBar on:submit={handleCommandSubmit} disabled={currentState !== ViewState.Idle} />
    </footer>
</div>

<style>
    :global(body) {
        --background-primary: #202123;
        --background-secondary: #2f3033;
        --background-modifier-border: #444649;
        --text-normal: #ececec;
        --text-muted: #9b9b9b;
        --text-error: #ff8080;
        --interactive-accent: #4e8cff;
    }
    .blink-note-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: var(--background-primary);
        color: var(--text-normal);
        font-family: sans-serif;
    }
    .blink-note-header {
        padding: 8px 12px;
        border-bottom: 1px solid var(--background-modifier-border);
    }
    .interactive-transcript {
        flex-grow: 1;
        padding: 12px;
        overflow-y: auto;
    }
    .welcome-message {
        color: var(--text-muted);
        text-align: center;
        margin-top: 40px;
    }
    .command-bar-area {
        padding: 8px;
        border-top: 1px solid var(--background-modifier-border);
    }
    .review-view-card {
        padding: 16px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background-color: var(--background-secondary);
    }
    .review-content {
        background-color: var(--background-primary);
        padding: 12px;
        border-radius: 4px;
        margin: 16px 0;
        font-family: monospace;
    }
    .primary-button {
        background-color: var(--interactive-accent);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
    }
</style>
