import "server-only";

// Feedback goes out through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// Without RESEND_API_KEY the form tells the player to use their mail app instead.
const TO = () => process.env.FEEDBACK_TO || "dj.baek223@gmail.com";
// onboarding@resend.dev works without a verified domain, but only delivers to the Resend account's own address.
const FROM = () => process.env.FEEDBACK_FROM || "WhatIf <onboarding@resend.dev>";

export const feedbackConfigured = () => Boolean(process.env.RESEND_API_KEY);

export type Feedback = { message: string; contact: string; where: string };

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Subject starts with [WhatIf] so the inbox can filter on it. */
export async function sendFeedback({ message, contact, where }: Feedback, signal?: AbortSignal) {
  const firstLine = message.split("\n")[0].trim();
  const subject = `[WhatIf] 의견: ${firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine}`;
  const text = [message, "", "---", `플레이 중이던 곳: ${where || "알 수 없음"}`, `연락처: ${contact || "남기지 않음"}`].join("\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), to: [TO()], subject, text, ...(looksLikeEmail(contact) && { reply_to: contact }) }),
    signal: AbortSignal.any([AbortSignal.timeout(10_000), ...(signal ? [signal] : [])]),
  });
  if (!res.ok) throw new Error(`[feedback] Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
