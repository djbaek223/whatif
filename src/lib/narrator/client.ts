import { NARRATE_TIMEOUT_MS, type NarrateRequest } from "./schema";

/** Calls the narration route. Returns null when AI is off, fails or is too slow, so callers fall back to templates. */
export async function narrate<T>(req: NarrateRequest): Promise<T | null> {
  try {
    const res = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(NARRATE_TIMEOUT_MS[req.kind]),
    });
    const json = await res.json();
    return json.ok ? (json.data as T) : null;
  } catch {
    return null;
  }
}

export async function aiAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/narrate", { signal: AbortSignal.timeout(5_000) });
    return Boolean((await res.json()).ai);
  } catch {
    return false;
  }
}
