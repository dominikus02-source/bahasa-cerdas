/** Browser-local recording checkpoint. No network upload and no secrets. */
import { repairWebmDuration } from "../../lib/jumpa/webm-duration";
import { assertRecordingStorageAvailable } from "./recording-quota";
const DB_NAME = "jumpa-recording-checkpoints";
const STORE = "chunks";
const META = "sessions";

interface CheckpointSession {
  id: string;
  createdAt: number;
  mimeType: string;
  completed: boolean;
  groupId?: string;
  chunks?: number;
  ownerId?: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact<T>(store: string, mode: IDBTransactionMode, work: (object: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = work(transaction.objectStore(store));
    let value: T;
    request.onsuccess = () => { value = request.result; };
    transaction.oncomplete = () => { db.close(); resolve(value); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}

export async function createRecordingCheckpoint(mimeType: string, groupId?: string, ownerId?: string): Promise<string> {
  const id = crypto.randomUUID();
  await transact(META, "readwrite", (store) => store.put({ id, createdAt: Date.now(), mimeType, completed: false, groupId, ownerId } satisfies CheckpointSession));
  return id;
}

export async function appendRecordingChunk(id: string, index: number, chunk: Blob, finalChunk = false): Promise<void> {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error("RECORDING_INVALID_INDEX");
  // The reserve is available for the last flush, never for continued recording.
  if (!finalChunk) await assertRecordingStorageAvailable(chunk.size);
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, META], "readwrite", { durability: "strict" });
    const meta = tx.objectStore(META);
    const request = meta.get(id);
    request.onsuccess = () => {
      const session = request.result as CheckpointSession | undefined;
      if (!session || session.completed || (session.chunks ?? 0) !== index) { tx.abort(); return; }
      tx.objectStore(STORE).put(chunk, id + ":" + String(index).padStart(10, "0"));
      meta.put({ ...session, chunks: index + 1 });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error("RECORDING_CHUNK_ORDER")); };
  });
}

export async function completeRecordingCheckpoint(id: string, mimeType: string): Promise<void> {
  const existing = await transact<CheckpointSession | undefined>(META, "readonly", (store) => store.get(id));
  if (!existing) throw new Error("RECORDING_CHECKPOINT_MISSING");
  await transact(META, "readwrite", (store) => store.put({ ...existing, mimeType, completed: true }));
}

export async function listRecordingCheckpoints(): Promise<CheckpointSession[]> {
  return transact<CheckpointSession[]>(META, "readonly", (store) => store.getAll());
}

export async function restoreRecordingCheckpoint(id: string): Promise<Blob> {
  const session = await transact<CheckpointSession | undefined>(META, "readonly", (store) => store.get(id));
  if (!session) throw new Error("RECORDING_CHECKPOINT_MISSING");
  const db = await openDatabase();
  const chunks = await new Promise<Blob[]>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).openCursor(IDBKeyRange.bound(id + ":", id + ":\uffff"));
    const parts: Blob[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { parts.push(cursor.value as Blob); cursor.continue(); }
    };
    transaction.oncomplete = () => { db.close(); resolve(parts); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
  if (!chunks.length) throw new Error("RECORDING_CHECKPOINT_EMPTY");
  if (session.chunks !== undefined && chunks.length !== session.chunks) throw new Error("RECORDING_CHECKPOINT_INCOMPLETE");
  return repairWebmDuration(new Blob(chunks, { type: session.mimeType }));
}

export async function deleteRecordingCheckpoint(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, META], "readwrite");
    const cursor = tx.objectStore(STORE).openCursor(IDBKeyRange.bound(id + ":", id + ":\uffff"));
    cursor.onsuccess = () => { const row = cursor.result; if (row) { row.delete(); row.continue(); } };
    tx.objectStore(META).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Recover all finalized clips from the most recent safety recording as one ZIP. */
export async function restoreLatestSafetyArchive(): Promise<Blob | null> {
  const sessions = await listRecordingCheckpoints();
  const latest = sessions.filter((item) => item.completed && item.groupId)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!latest?.groupId) return null;
  const group = sessions.filter((item) => item.completed && item.groupId === latest.groupId)
    .sort((a, b) => a.createdAt - b.createdAt);
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (let i = 0; i < group.length; i++) {
    const clip = await restoreRecordingCheckpoint(group[i].id);
    zip.file(`bagian-${String(i + 1).padStart(4, "0")}.webm`, clip);
  }
  zip.file("PETUNJUK.txt", "Rekaman pemulihan JUMPA. Setiap bagian merupakan video tersendiri yang sudah difinalisasi. Bagian yang sedang direkam saat browser berhenti paksa mungkin tidak tersimpan.\n");
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

/** Explicit user-requested cleanup; never delete recordings without a click. */
export async function deleteRecordingGroup(groupId: string): Promise<number> {
  if (!groupId) throw new Error("RECORDING_GROUP_REQUIRED");
  const sessions = await listRecordingCheckpoints();
  const matches = sessions.filter((session) => session.groupId === groupId);
  for (const session of matches) await deleteRecordingCheckpoint(session.id);
  return matches.length;
}

export interface RecordingRecoverySummary {
  groupId: string;
  createdAt: number;
  segments: number;
  completed: boolean;
}

export async function listRecoverableRecordingGroups(): Promise<RecordingRecoverySummary[]> {
  const sessions = await listRecordingCheckpoints();
  const groups = new Map<string, RecordingRecoverySummary>();
  for (const session of sessions) {
    if (!session.groupId) continue;
    const current = groups.get(session.groupId);
    if (!current) groups.set(session.groupId, {
      groupId: session.groupId,
      createdAt: session.createdAt,
      segments: session.completed ? 1 : 0,
      completed: session.completed,
    });
    else {
      current.createdAt = Math.min(current.createdAt, session.createdAt);
      current.segments += Number(session.completed);
      current.completed &&= session.completed;
    }
  }
  return [...groups.values()].sort((a, b) => b.createdAt - a.createdAt);
}
