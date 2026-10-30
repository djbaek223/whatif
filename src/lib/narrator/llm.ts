import "server-only";
import { z } from "zod";
import { promptFor, systemFor } from "./prompts";
import { NARRATE_TIMEOUT_MS, type NarrateRequest } from "./schema";

// Both providers speak the OpenAI-compatible chat completions API.
// WHATIF_PROVIDER picks one: "deepseek" (default, cheapest) or "openai" (GPT-6 Luna).
type Provider = { name: string; baseUrl: string; model: string; apiKey: string | undefined; extra: Record<string, unknown> };

function provider(): Provider {
  if (process.env.WHATIF_PROVIDER === "openai") {
    // GPT-6 Luna reasons before it answers. Left at the API default that thinking alone took most of the
    // player's wait, and it counts against max_completion_tokens. Narration needs little of it.
    const effort = process.env.OPENAI_REASONING_EFFORT || "low";
    return {
      name: "OpenAI",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.WHATIF_MODEL || "gpt-6-luna",
      apiKey: process.env.OPENAI_API_KEY,
      extra: { max_completion_tokens: 4000, reasoning_effort: effort },
    };
  }
  // DeepSeek directly (https://api-docs.deepseek.com) or via BytePlus ModelArk with DEEPSEEK_BASE_URL.
  return {
    name: "DeepSeek",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.WHATIF_MODEL || "deepseek-flash",
    apiKey: process.env.DEEPSEEK_API_KEY,
    extra: { thinking: { type: "disabled" }, max_tokens: 4000 }, // narration doesn't need reasoning; keeps it fast and cheap
  };
}

export function aiConfigured(): boolean {
  return Boolean(provider().apiKey);
}

export class NarratorError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Usage = { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };

async function complete(messages: { role: "system" | "user" | "assistant"; content: string }[], signal: AbortSignal): Promise<{ content: string; usage?: Usage }> {
  const p = provider();
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify({ model: p.model, messages, response_format: { type: "json_object" }, ...p.extra }),
    signal,
  });
  if (!res.ok) throw new NarratorError(`${p.name} ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
  const json = await res.json();
  const choice = json.choices?.[0];
  if (choice?.finish_reason === "length") throw new NarratorError(`${p.name} output was cut off`, 502);
  return { content: choice?.message?.content ?? "", usage: json.usage };
}

/**
 * Asks for JSON matching the schema; retries once with the validation error when the reply doesn't fit,
 * but only while the player is still likely to be waiting. Logs each call's time and token use.
 */
async function ask<S extends z.ZodType>(kind: NarrateRequest["kind"], schema: S, prompt: string, abort?: AbortSignal): Promise<z.infer<S> | null> {
  const budget = NARRATE_TIMEOUT_MS[kind];
  const signal = abort ? AbortSignal.any([abort, AbortSignal.timeout(budget)]) : AbortSignal.timeout(budget);
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemFor(schema) },
    { role: "user", content: prompt },
  ];
  const started = Date.now();
  for (let attempt = 1; attempt <= 2; attempt++) {
    const t = Date.now();
    const { content, usage } = await complete(messages, signal);
    const reasoning = usage?.completion_tokens_details?.reasoning_tokens;
    console.info(
      `[narrate] ${kind} #${attempt} ${provider().name} ${Date.now() - t}ms in=${usage?.prompt_tokens ?? "?"} out=${usage?.completion_tokens ?? "?"}${reasoning ? ` reasoning=${reasoning}` : ""}`,
    );
    let problem: string;
    try {
      const parsed = schema.safeParse(JSON.parse(content));
      if (parsed.success) return parsed.data;
      problem = parsed.error.message;
    } catch {
      problem = content ? "올바른 JSON이 아닙니다." : "빈 응답이었습니다.";
    }
    console.warn(`[narrate] ${kind} #${attempt} didn't fit the schema: ${problem.slice(0, 200)}`);
    // A second try takes about as long as the first. If it can't finish in time, let the player move on now.
    if (Date.now() - started > budget / 2) return null;
    messages.push({ role: "assistant", content: content || "{}" }, { role: "user", content: `방금 답이 스키마에 맞지 않습니다 (${problem.slice(0, 300)}). 스키마에 맞는 JSON만 다시 주세요.` });
  }
  return null;
}

/** `signal` is the player's request: when they stop waiting, the provider call stops too. */
export async function narrate(req: NarrateRequest, signal?: AbortSignal): Promise<unknown> {
  const { schema, prompt } = promptFor(req);
  return ask(req.kind, schema, prompt, signal);
}
