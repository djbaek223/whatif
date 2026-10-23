import type { NarrateRequest } from "./schema";

// How long to wait for the narrator before falling back to templates. The opening and ending
// write the most (about 8-10s normally), so they get more room than a scene or a classification.
export const NARRATE_TIMEOUT_MS: Record<NarrateRequest["kind"], number> = {
  opening: 25_000,
  ending: 25_000,
  scene: 15_000,
  classify: 10_000,
};

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
