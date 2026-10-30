import { eraHints } from "../era";
import { eventById } from "../events";
import { isBigChoice, lifeFacts, lifeSummary, momentChanges, TURNING_POINT_ID } from "../engine";
import { dueThread, wantsEpisodes } from "../hybrid";
import { eventCategory } from "../personal";
import { CATEGORY_LABELS, type LifeState } from "../types";
import type { NarrateRequest } from "./schema";

/**
 * The one narration call for the life's pending choice: a moment the narrator writes (a free "personal" one, or one
 * the pool scheduled), or a rewrite of a fixed fork. Everyday moments for the coming months ride along when running low.
 */
export function choiceRequest(life: LifeState): Extract<NarrateRequest, { kind: "moment" | "scene" }> | null {
  const pending = life.pending;
  if (!pending || pending.eventId === TURNING_POINT_ID) return null;
  const seeds = life.seeds ?? [];
  const common = { summary: lifeSummary(life), facts: lifeFacts(life), persona: life.persona, eraHints: eraHints(life.mi) };
  // A big fork usually changes the life, which would void moments written against the life as it is now.
  const episodes = wantsEpisodes(life) && !isBigChoice(pending) ? { episodes: true } : {};
  if (pending.eventId === "personal" || pending.slot) {
    const ev = pending.slot ? eventById(pending.eventId) : undefined;
    const thread = dueThread(life);
    return {
      kind: "moment",
      ...common,
      allowed: momentChanges(life),
      recent: life.recent ?? [],
      seeds,
      ...(ev
        ? { slot: { title: ev.title, intro: pending.scene, category: CATEGORY_LABELS[eventCategory(ev)], keywords: ev.keywords ?? [], small: !!ev.small, rare: !!pending.rare } }
        : {}),
      ...(thread ? { thread } : {}),
      ...episodes,
    };
  }
  return {
    kind: "scene",
    ...common,
    title: pending.title,
    intro: pending.scene,
    seeds,
    options: pending.options.map(({ id, label, detail }) => ({ id, label, ...(detail ? { detail } : {}) })),
    ...episodes,
  };
}
