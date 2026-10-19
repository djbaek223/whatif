import type { NarrateRequest } from "./schema";

/** Calls the narration route. Returns null when AI is off or fails, so callers fall back to templates. */
export async function narrate<T>(req: NarrateRequest): Promise<T | null> {
  try {
    const res = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const json = await res.json();
    return json.ok ? (json.data as T) : null;
  } catch {
    return null;
  }
}

export async function aiAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/narrate");
    return Boolean((await res.json()).ai);
  } catch {
    return false;
  }
}
