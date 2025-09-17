# Blink Note — Developer Spec (ขยายละเอียด) + Dynamic File Sync
เอกสารนี้โฟกัส **ส่วนงาน Dev ตั้งแต่ต้น** ตามโครงสร้างเดิมของโปรเจกต์ และแทรกความสามารถ **Dynamic File Sync** ให้เนียนกับสถาปัตยกรรมเดิม (agents, services, tools, ui, settings, roadmap)0  

---

## 0) ขอบเขตและข้อจำกัด
- เป้าหมาย: ปลั๊กอิน Obsidian ที่ทำงานแบบ **Agentic IDE** มี Planner/Executor, ToolRegistry, EventBus, UI Svelte, Settings, และระบบซิงค์ไฟล์แบบ local-first  
- ภาษาหลัก: TypeScript + Svelte  
- ทดสอบ: Vitest  
- โครงหลักและ Milestones อ้างอิงจากเอกสาร Dev เดิมของโปรเจกต์1

---

## 1) ภาพรวมสถาปัตยกรรม

src/ ├─ main.ts                 # lifecycle plugin ├─ agents/                 # PlannerAgent, ExecutorAgent ├─ services/               # EventBus, SessionMemory, AuditLog, IndexStore(ใหม่) ├─ tools/ │  ├─ ToolRegistry.ts │  └─ providers/ │     ├─ FilesystemProvider.ts │     ├─ ClickUpProvider.ts │     ├─ SyncProvider.ts         # เพิ่ม │     ├─ RemoteAdapter.ts        # interface │     ├─ WebDAVAdapter.ts        # impl │     └─ S3Adapter.ts            # impl (ทางเลือก) ├─ types/                   # Plan, Tool, Agent, Sync(เพิ่ม) ├─ ui/ │  ├─ BlinkNoteView.ts │  └─ components/ │     ├─ CommandBar.svelte │     ├─ PlanningCard.svelte │     ├─ ExecutionCard.svelte │     └─ SyncStatus.svelte       # เพิ่ม ├─ settings/ │  ├─ SettingTab.ts │  └─ SyncSettings.ts            # เพิ่ม

โครงชุดนี้ตรงกับวิธีแยก concerns ในไฟล์เดิม และสอดคล้องกับแนวทาง “เพิ่มความสามารถใหม่ผ่าน providers”2  

---

## 2) Data Types ที่ต้องใช้ (เพิ่มไฟล์ `types/Sync.ts`)
```ts
export type FilePath = string;
export type HashHex = string;     // SHA-256 hex
export type ETag = string;

export interface FileMeta {
  path: FilePath; size: number; etag?: ETag; lastModified?: number;
  remoteId?: string;
}

export type JobOp = 'up'|'down'|'del';
export interface Job {
  op: JobOp; path: FilePath; hash?: HashHex; remoteId?: string; attempt?: number;
}

export interface LocalChange {
  path: FilePath;
  baseHash?: HashHex;            // base version used for 3-way merge
  content?: ArrayBuffer;         // omit for delete
  isBinary?: boolean;
}

export type RemoteChangeOp = 'up'|'del'|'rename';
export interface RemoteChange {
  op: RemoteChangeOp;
  path: FilePath; newPath?: FilePath;
  etag?: ETag; remoteId?: string; lastModified?: number; isBinary?: boolean;
  contentUrl?: string;           // optional for lazy pull
}

export interface SyncStatus {
  queued: number; running: boolean; lastSyncedAt?: number;
}

export interface ConflictDetail {
  path: FilePath; base?: string; local?: string; remote?: string;
  isBinary?: boolean;
}


---

3) main.ts — Lifecycle และ Wiring

export default class BlinkNotePlugin extends Plugin {
  private bus!: EventBus;
  private tools!: ToolRegistry;
  private index!: IndexStore;
  private sync!: SyncEngine;

  async onload() {
    this.bus = new EventBus();
    this.index = new IndexStore(() => this.loadData(), (d)=>this.saveData(d));

    const settings = await this.loadSettings(); // รวม SyncSettings
    const adapter = buildRemoteAdapterFrom(settings.sync); // WebDAV/S3/Custom
    this.sync = new SyncEngine(adapter, this.bus, this.index, settings.sync);

    this.tools = new ToolRegistry(this.bus);
    this.tools.registerProvider(new FilesystemProvider(this.app));
    this.tools.registerProvider(new ClickUpProvider(settings.clickup));
    this.tools.registerProvider(new SyncProvider(this.sync)); // เพิ่ม

    this.registerVaultWatchers(); // ฟัง create/modify/delete/rename -> enqueue
    this.addSettingTab(new SettingTab(this.app, this));      // รวม SyncSettings
    this.registerView(/* BlinkNoteView */);

    // Agents
    const planner = new PlannerAgent(this.bus, this.tools /*, LLM */);
    const executor = new ExecutorAgent(this.bus, this.tools);

    // Commands
    this.addCommand({ id:'sync-pull', name:'Sync: Pull', callback:()=>this.sync.pull() });
    this.addCommand({ id:'sync-push', name:'Sync: Push', callback:()=>this.sync.push() });
  }

  async onunload() { /* flush queues, persist index */ }
}

สอดคล้องรูปแบบ entrypoint และการประกอบ Agent/Tools/Settings ในเอกสารเดิม


---

4) EventBus — สัญญาและรูปแบบตั้งชื่อ

ชื่ออีเวนต์แบบ Domain.Action เช่น Plan.Created, Exec.Update, Sync.Progress

Payload ต้องมี version เพื่อรองรับ migration

รายการอีเวนต์สำคัญ:

User.Command {text}

Plan.Created {plan}

Plan.Approved {planId}

Exec.Update {stepId,status,stdout,stderr}

Sync.Queued {path, op}

Sync.Started {}

Sync.Progress {done,total,current?}

Sync.Conflict {detail: ConflictDetail}

Sync.Error {code, message, path?} การมี EventBus ที่ชัดเจนเป็นหัวใจของการ decouple ในโครงเดิม




---

5) IndexStore — โครงสร้างข้อมูลและ Persistence

เก็บใน plugin data JSON ผ่าน loadData()/saveData()

สคีมา:


interface IndexSnapshotV1 {
  version: 1;
  cursor?: string;
  files: Record<FilePath, {
    remoteId?: string;
    contentHash?: HashHex;        // last known local hash
    baseHash?: HashHex;           // base for 3-way merge
    etag?: ETag;
  }>;
  outbox: Job[];
}

ฟังก์ชัน:

get(path), set(path,meta), remove(path)

list() for iteration

replaceOutbox([]) atomically


บีบอัด/compact: ล้าง entry ที่ลบไปแล้ว, จำกัด outbox length

เวอร์ชันสคีมา: เพิ่ม version เพื่อรองรับ migration



---

6) File Watchers และ Debounce/Coalesce

private registerVaultWatchers() {
  const debounced = debounceByPath(async (file:TFile, op:JobOp)=>{
    const buf = await this.app.vault.readBinary(file);
    const hash = await sha256Hex(buf);
    this.sync.enqueue({ op, path: file.path, hash });
  }, 400); // 300–1000 ms ตาม settings

  this.registerEvent(this.app.vault.on('create', (f)=>debounced(f,'up')));
  this.registerEvent(this.app.vault.on('modify', (f)=>debounced(f,'up')));
  this.registerEvent(this.app.vault.on('delete', (f)=>debounced(f,'del')));
  this.registerEvent(this.app.vault.on('rename', (f,old)=> {
    // สร้างเป็น down+up หรือ op 'rename' ใน outbox ถ้ารองรับ
    debounced(f,'up');
  }));
}

Coalesce ต่อไฟล์: ถ้าไฟล์เดียวโดนแก้หลายครั้งในช่วงสั้น ให้เหลือหนึ่งงาน



---

7) Hashing และการจัดการ Binary

export async function sha256Hex(buf:ArrayBuffer):Promise<HashHex>{
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

Markdown vs Binary: ตรวจจากนามสกุลหรือ content sniffing

Binary ให้อัปโหลดเต็มไฟล์หรือ multipart; ไม่ทำ diff3



---

8) SyncEngine — อัลกอริทึม

8.1 คิวและ Backoff

โครงคิว in-memory พร้อม persist ใน IndexStore.outbox

ความขนาน: จำกัดด้วย concurrency จาก Settings

Backoff: delay = min(maxDelay, base * 2^retries) + jitter(0..base)

Retryable: 408/429/5xx/เน็ตหลุด

Non-retryable: 401/403/404/409(ถ้าตรวจแล้วเป็น conflict เชิงตรรกะ)


8.2 Push (local → remote)

1. Drain outbox ตาม op


2. สำหรับ up:

โหลดไฟล์ → คำนวณ hash

ตรวจ baseHash จาก IndexStore

remote.stat() เพื่อเช็ค ETag/remoteId

ถ้า remote ETag == baseHash → PUT/POST ได้

ถ้าไม่ตรง → ดึง remote → ทำ 3-way merge (เฉพาะ Markdown)

อัปโหลดสำเร็จ → อัปเดต baseHash=hash, etag, remoteId



3. สำหรับ del:

เรียก remote delete หรือ mark tombstone



4. บันทึกผลและ emit Sync.Progress



8.3 Pull (remote → local)

1. remote.pull(cursor) ได้ลิสต์ RemoteChange[] + next cursor


2. สำหรับแต่ละ change:

op==='del' → ลบไฟล์โลคัล ถ้าอยู่ใน scope

op==='up' → ถ้าเป็น Markdown:

อ่าน local + baseHash → diff3 กับ remote

เขียนไฟล์ใหม่และอัปเดต baseHash

ถ้า merge fail → สร้าง conflicted-<ts>.md + emit Conflict


Binary: เขียนทับหรือ keep-both ตาม policy



3. อัปเดต cursor ใน IndexStore




---

9) Conflict Resolution — Markdown-aware

เก็บ baseHash ทุกครั้งที่ sync สำเร็จ

diff3 แบบรู้ YAML frontmatter และ code fence:

แยกส่วน frontmatter (--- ... ---) → merge แบบ key-level

merge เนื้อหาโดยบล็อก ไม่แตก code fence


ถ้า merge fail:

เขียน note (conflicted YYYY-MM-DD hhmm).md

แนบส่วนต่างแบบ unified diff

Emit Sync.Conflict เพื่อ UI แสดง Resolver




---

10) Filtering และ Scope

Include/Exclude โดย:

glob patterns, regex, path prefix

โฟลเดอร์ระบบ .obsidian/ และ temp ไม่นำเข้าคิว


โหมด per-folder:

two-way, local-only, remote-only




---

11) Chunking และ Large Files

เกณฑ์: > 2–8 MB ใช้ multipart/chunked ตามความสามารถ adapter

กลยุทธ์:

WebDAV: PUT ตรงทั้งไฟล์หรือ TUS/partial ถ้าปลายทางรองรับ

S3: Multipart Upload (init → uploadPart → complete)


Resume: เก็บ uploadId/partETags ใน IndexStore ระหว่างทำ



---

12) RemoteAdapter — สัญญา และความสามารถ

export interface RemoteAdapter {
  // ดึงเปลี่ยนแปลงตั้งแต่ cursor; คืน changes และ nextCursor ผ่าน side-channel หรือ encoded ในตัว list
  pull(since: string): Promise<{ changes: RemoteChange[]; nextCursor: string }>;

  // อัปโหลด/ลบ/rename ผ่าน LocalChange
  push(change: LocalChange): Promise<{ etag?: ETag; remoteId?: string }>;

  // ข้อมูลไฟล์บนปลายทาง
  stat(pathOrId: string): Promise<FileMeta | null>;

  // ความสามารถเพิ่มเติมแบบ optional
  init?(): Promise<void>;
  delete?(pathOrId: string): Promise<void>;
  rename?(oldPath: string, newPath: string): Promise<void>;
  multipart?: {
    start(path: string, size: number, contentType?: string): Promise<{ uploadId: string }>;
    uploadPart(uploadId: string, partNumber: number, chunk: ArrayBuffer): Promise<{ etag: ETag }>;
    complete(uploadId: string, parts: { partNumber:number; etag:ETag }[]): Promise<{ etag: ETag }>;
    abort?(uploadId: string): Promise<void>;
  };
  caps?: {
    changeFeed?: boolean; etagWeakOK?: boolean; lazyContentUrl?: boolean; batchStat?: boolean;
  };
}


---

13) ตัวอย่าง Adapters

13.1 WebDAVAdapter (ย่อ)

export class WebDAVAdapter implements RemoteAdapter {
  constructor(private baseUrl:string, private auth:{user:string; pass:string}) {}

  private authHeader() { return 'Basic ' + btoa(`${this.auth.user}:${this.auth.pass}`); }

  async stat(path: string) {
    const r = await fetch(`${this.baseUrl}/${encodeURIComponent(path)}`, { method:'HEAD', headers:{Authorization:this.authHeader()} });
    if (r.status===404) return null;
    return { path, etag: r.headers.get('ETag')||undefined, size: +(r.headers.get('Content-Length')||0) };
  }

  async push(c: LocalChange) {
    if (!c.content) throw new Error('No content');
    const r = await fetch(`${this.baseUrl}/${encodeURIComponent(c.path)}`, {
      method:'PUT',
      headers:{ Authorization:this.authHeader(), 'If-None-Match': c.baseHash ?? '' },
      body:c.content
    });
    if (!r.ok) throw new Error(`WebDAV PUT failed ${r.status}`);
    return { etag: r.headers.get('ETag')||undefined, remoteId: c.path };
  }

  async pull(since: string) {
    // สมมติปลายทางมี endpoint changes
    const r = await fetch(`${this.baseUrl}/changes?since=${encodeURIComponent(since)}`, { headers:{Authorization:this.authHeader()} });
    const { changes, nextCursor } = await r.json();
    return { changes, nextCursor };
  }
}

13.2 S3Adapter (ครบเส้นทางหลัก)

export class S3Adapter implements RemoteAdapter {
  constructor(private cfg:{ bucket:string; region:string; accessKeyId:string; secretAccessKey:string }) {}

  async stat(path: string) {
    const r = await s3HeadObject(this.cfg, path); // ใช้ไลบรารีหรือ fetch แบบ SigV4
    if (r.status===404) return null;
    return { path, etag:r.ETag?.replaceAll('"',''), size:r.ContentLength };
  }

  async push(c: LocalChange) {
    if (!c.content) throw new Error('No content');
    // ขนาดเล็ก: PutObject
    if ((c.content.byteLength||0) < 5*1024*1024) {
      const r = await s3PutObject(this.cfg, c.path, c.content, { ifMatch: c.baseHash });
      return { etag: r.ETag?.replaceAll('"',''), remoteId: c.path };
    }
    // ขนาดใหญ่: Multipart
    const init = await s3CreateMultipart(this.cfg, c.path);
    const parts = await uploadInParts(this.cfg, init.UploadId, c.path, c.content);
    const comp = await s3CompleteMultipart(this.cfg, c.path, init.UploadId, parts);
    return { etag: comp.ETag?.replaceAll('"',''), remoteId: c.path };
  }

  async pull(since: string) {
    // ใช้ ListObjectV2 + last modified filter + pagination
    const { objects, nextCursor } = await s3ListChanges(this.cfg, since);
    const changes: RemoteChange[] = objects.map(o=>({ op:'up', path:o.Key, etag:o.ETag?.replaceAll('"',''), isBinary:true }));
    return { changes, nextCursor };
  }
}

> บน S3 แนะนำเปิด Bucket Versioning เพื่อย้อนเวอร์ชันได้และช่วย conflict audit




---

14) SyncProvider — Tools สำหรับ Planner/Executor

export class SyncProvider implements ToolProvider {
  constructor(private sync: SyncEngine) {}

  manifest(): Tool[] {
    return [
      { id:'sync_pull',  desc:'Pull remote changes', schema:{} },
      { id:'sync_push',  desc:'Push local changes',  schema:{ paths:{type:'array',items:{type:'string'},optional:true} } },
      { id:'sync_status',desc:'Get sync status',     schema:{} },
    ];
  }

  async run(toolId:string, args:any) {
    switch(toolId){
      case 'sync_pull':   return await this.sync.pull();
      case 'sync_push':   return await this.sync.push(args?.paths);
      case 'sync_status': return this.sync.status();
    }
  }
}

กติกา Planner: ก่อนแผนที่แก้ไฟล์ ใส่ sync_pull เป็น pre-step และ sync_push เป็น post-step

ตรงกับแนวทาง “ToolRegistry เป็นศูนย์กลางเครื่องมือ” ในเอกสารเดิม



---

15) UI — SyncStatus.svelte

คุณสมบัติ:

แสดงสถานะคิวและเวลา sync ล่าสุด

ปุ่ม Pull/Push/Pause

Conflict Resolver: เปิด diff viewer


โค้ดสรุป:

<script lang="ts">
  import { onMount } from 'svelte';
  let status = { queued:0, running:false, lastSyncedAt: undefined };
  onMount(() => EventBus.subscribe('Sync.Progress', s => status = s));
  function pull(){ window.tools.run('sync_pull'); }
  function push(){ window.tools.run('sync_push'); }
</script>

<section>
  <h3>Sync</h3>
  <p>Queued: {status.queued}</p>
  <p>Last: {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : '-'}</p>
  <button on:click={pull}>Pull</button>
  <button on:click={push}>Push</button>
</section>


---

16) Settings — สคีมาและดีฟอลต์

export interface SyncConfig {
  enabled: boolean;
  backend: 'webdav'|'s3'|'custom';
  webdav?: { baseUrl:string; user:string; pass:string };
  s3?: { bucket:string; region:string; accessKeyId:string; secretAccessKey:string };
  include: string[];           // globs
  exclude: string[];           // globs
  mode: 'two-way'|'local-only'|'remote-only';
  debounceMs: number;          // 300–1000
  concurrency: number;         // 2–6 desktop, 1–2 mobile
  chunkSize: number;           // MB
  bandwidthCapMbps?: number;
  security: { encryptTokens: boolean };
}

export const defaultSyncConfig: SyncConfig = {
  enabled: true, backend:'webdav',
  include:['**/*.md','assets/**'], exclude:['.obsidian/**','**/*.tmp'],
  mode:'two-way', debounceMs:500, concurrency:3, chunkSize:8,
  security:{ encryptTokens:true }
};


---

17) ความปลอดภัย

เก็บโทเคนแบบเข้ารหัสด้วย Web Crypto AES-GCM

คีย์มาจาก passphrase ผู้ใช้ด้วย PBKDF2


ตรวจเส้นทางไฟล์ป้องกัน path traversal

บังคับ HTTPS/TLS ในทุก adapter

Validate Content-Type และขนาดไฟล์ก่อนเขียน



---

18) Logging/Telemetry

AuditLogService: บันทึกทุก action แบบ append-only


log('sync.push', { path, size, attempt, ok });
log('sync.pull', { changes: n, cursor });
log('sync.conflict', { path, reason });

ปิด/เปิด telemetry ได้ใน Settings



---

19) Testing — แผนครบมิติ

Unit

IndexStore: persist/load, migrate

SyncEngine: queue, backoff, idempotency

diff3 Merge: frontmatter-aware, fence-aware


Integration

FakeRemoteServer: จำลอง WebDAV/S3

E2E 1: “rename → edit → push → pull” ข้ามสองอินสแตนซ์

E2E 2: เน็ตหลุดระหว่าง multipart → resume


Property-based

สุ่มลำดับ op (create/modify/rename/delete) แล้วตรวจ invariant:

ไม่มีการสูญหายข้อมูล

baseHash ตรงกับเนื้อหาล่าสุดเมื่อ push สำเร็จ



ตัวอย่าง Vitest โครง:

it('push then pull keeps baseHash consistent', async ()=>{
  // Arrange index, fake remote, file content
  // Act push, mutate remote, pull
  // Assert baseHash == local hash, no conflicts
});


---

20) Performance Budgets

Watcher throughput: ≥ 50 events/วินาที บนเดสก์ท็อป

อ่านไฟล์: ใช้ binary API เพื่อลดแปลงเป็น string

หน่วยความจำคิว: ≤ 50MB ที่ 10k jobs

UI update: throttle 250ms



---

21) Migration

IndexStore.version ↑ เมื่อเพิ่มฟิลด์ใหม่

ตัวแปลง Vn→Vn+1 ต้อง lossless

สำรอง snapshot ก่อนอัปเกรด schema



---

22) CLI/Dev Scripts (ใน scripts/)

build: สร้างปลั๊กอิน

dev: watch + reload

release: bundle + checksum

e2e: run fake-remote + tests



---

23) ตัวอย่างแผนงานจาก Planner ที่แทรก Sync

steps:
  - tool: sync_pull
  - tool: find_file   args: { pattern: "project_summary_*.md" }
  - tool: read_file   args: { path: "{{steps[1].result[0]}}" }
  - tool: create_task args: { title: "Summarize", body: "{{steps[2].content}}" }
  - tool: sync_push

แนวคิด planner→approval→execution แบบนี้ปรากฏในสเปกเดิมของโปรเจกต์


---

24) Roadmap Dev 3 เดือน (ผสาน Sync)

M1 (สัปดาห์ 1–4): EventBus, ToolRegistry, main.ts, UI mock, Skeleton Agents, เพิ่มโครง Sync (IndexStore, RemoteAdapter, SyncProvider)

M2 (สัปดาห์ 5–8): Planner ต่อ LLM, Executor เรียก Filesystem, FilesystemProvider + tests, Implement SyncEngine + UI SyncStatus mock

M3 (สัปดาห์ 9–12): ClickUp integration, E2E, Error UI, WebDAVAdapter + S3 basic, Conflict Handler, Release 0.1.0



---



