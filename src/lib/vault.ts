// Encrypted, device-only storage for personal data.
//
// Values are sealed with AES-GCM under a key that is generated in the browser and kept in IndexedDB as a
// non-extractable CryptoKey: scripts can use it but never read its bytes, so a copy of the browser's storage
// files is useless on its own. Nothing here is sent to the server. If IndexedDB or Web Crypto is missing,
// every call fails closed and nothing is written.

const DB_NAME = "whatif-vault";
const STORE = "keys";
const KEY_ID = "device";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idb<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

let keyPromise: Promise<CryptoKey> | null = null;

function deviceKey(): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    const db = await openDb();
    try {
      const existing = await idb<CryptoKey | undefined>(db, "readonly", (s) => s.get(KEY_ID));
      if (existing) return existing;
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      await idb(db, "readwrite", (s) => s.put(key, KEY_ID));
      return key;
    } finally {
      db.close();
    }
  })().catch((error) => {
    keyPromise = null;
    throw error;
  });
  return keyPromise;
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function seal(value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deviceKey(), data);
  // Chunked base64: spreading a large save into String.fromCharCode at once can overflow the call stack.
  const bytes = new Uint8Array(cipher);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return JSON.stringify({ v: 1, iv: toB64(iv), data: btoa(bin) });
}

export async function unseal<T>(raw: string): Promise<T | null> {
  try {
    const { v, iv, data } = JSON.parse(raw) as { v: number; iv: string; data: string };
    if (v !== 1) return null;
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await deviceKey(), fromB64(data));
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null; // tampered, written under a deleted key, or storage unavailable
  }
}

/** Destroys the device key, which makes anything sealed under it unreadable. */
export async function destroyKey(): Promise<void> {
  keyPromise = null;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
