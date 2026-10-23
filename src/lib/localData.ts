// What the app keeps in this browser. The profile is stored only when the user opts in; game progress is kept
// in sessionStorage (gone when the tab closes) unless they do. Both are encrypted with the device key (vault.ts).
import type { Profile } from "./types";
import { destroyKey, seal, unseal } from "./vault";

const PROFILE_KEY = "whatif:profile:v1";
const PROGRESS_KEY = "whatif:progress:v1";
const DRAFT_KEY = "whatif:draft:v1"; // answers typed so far, so a refresh doesn't lose them
const LEGACY_KEYS = ["whatif:save:v1"]; // plaintext saves from the prototype
export const PROFILE_TTL_DAYS = 180;
const TTL_MS = PROFILE_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface StoredProfile {
  profile: Profile;
  savedAt: number;
}

// Writes and deletes run in order, so a slow encryption can't land after a newer write or a wipe.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

function storages(): Storage[] {
  try {
    return [localStorage, sessionStorage];
  } catch {
    return []; // storage blocked (some private modes); the app works without saving
  }
}

function remove(key: string) {
  for (const s of storages()) {
    try {
      s.removeItem(key);
    } catch {
      // ignore: nothing to remove from a blocked storage
    }
  }
}

function read(s: Storage, key: string): string | null {
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

export function dropLegacySaves() {
  LEGACY_KEYS.forEach(remove);
}

export async function loadProfile(): Promise<StoredProfile | null> {
  const local = storages()[0];
  const raw = local && read(local, PROFILE_KEY);
  if (!raw) return null;
  const stored = await unseal<StoredProfile>(raw);
  if (!stored || Date.now() - stored.savedAt > TTL_MS) {
    remove(PROFILE_KEY);
    return null;
  }
  return stored;
}

export function saveProfile(profile: Profile): Promise<StoredProfile> {
  return enqueue(async () => {
    const stored = { profile, savedAt: Date.now() };
    storages()[0]?.setItem(PROFILE_KEY, await seal(stored));
    return stored;
  });
}

export function forgetProfile(): Promise<void> {
  return enqueue(async () => remove(PROFILE_KEY));
}

async function readSealed<T>(key: string): Promise<T | null> {
  for (const s of storages()) {
    const raw = read(s, key);
    if (raw) return unseal<T>(raw);
  }
  return null;
}

function writeSealed(key: string, value: unknown, persist: boolean): Promise<void> {
  return enqueue(async () => {
    const [local, session] = storages();
    if (!local) return;
    const sealed = await seal(value);
    (persist ? local : session).setItem(key, sealed);
    (persist ? session : local).removeItem(key);
  }).catch(() => undefined); // quota or crypto failure: keep going without a save
}

export const readProgress = <T>() => readSealed<T>(PROGRESS_KEY);

/** persist=true keeps progress across visits (localStorage); otherwise only for this tab (sessionStorage). */
export const writeProgress = (value: unknown, persist: boolean) => writeSealed(PROGRESS_KEY, value, persist);

export const readDraft = <T>() => readSealed<T>(DRAFT_KEY);

/** Same storage rules as progress: this tab only unless the user chose to keep their profile on the device. */
export const writeDraft = (value: unknown, persist: boolean) => writeSealed(DRAFT_KEY, value, persist);

export function clearDraft(): Promise<void> {
  return enqueue(async () => remove(DRAFT_KEY));
}

/** Removes everything this app stored on the device and destroys the encryption key. */
export function eraseAll(): Promise<void> {
  return enqueue(async () => {
    [PROFILE_KEY, PROGRESS_KEY, DRAFT_KEY, ...LEGACY_KEYS].forEach(remove);
    await destroyKey();
  });
}
