/**
 * The email that tells the owner about new feedback, sent through Resend:
 * plain text, every field, the reader's address as reply-to when given.
 */
import type { Category, Feedback } from "./parse.ts";

export const FEEDBACK_TO = "cmaintz@outlook.com";
export const FEEDBACK_FROM = "Atlas <onboarding@resend.dev>";
export const RESEND_URL = "https://api.resend.com/emails";

const CATEGORY_NAMES: Record<Category, string> = {
  bug: "Bug",
  content: "Content error",
  idea: "Idea",
  other: "Other",
};

/** "[Atlas feedback] Bug: the first few words…", one line, at most ~100 characters. */
export function subjectOf(f: Pick<Feedback, "category" | "message">): string {
  const words = f.message.replace(/[\r\n\t]+/g, " ").trim().split(/\s+/);
  let head = words.slice(0, 8).join(" ");
  if (head.length > 60) head = head.slice(0, 60).trimEnd();
  const more = head.length < words.join(" ").length ? "..." : "";
  // deno-lint-ignore no-control-regex
  const clean = (head + more).replace(/[\u0000-\u001f\u007f]/g, "");
  return `[Atlas feedback] ${CATEGORY_NAMES[f.category]}: ${clean}`;
}

/** The plain-text email body: every field, the message last. */
export function emailText(f: Feedback, at: Date): string {
  return [
    `Category: ${CATEGORY_NAMES[f.category]}`,
    `Reply to: ${f.email ?? "(not given)"}`,
    `Page: ${f.page ?? "(unknown)"}`,
    `Language: ${f.lang}`,
    `Received: ${at.toISOString()}`,
    "",
    f.message,
    "",
    "--",
    "Sent by the Atlas feedback form. Stored in private.feedback, deleted after 180 days.",
  ].join("\n");
}

/** The Resend API request body. */
export function resendPayload(f: Feedback, at: Date): Record<string, unknown> {
  return {
    from: FEEDBACK_FROM,
    to: [FEEDBACK_TO],
    subject: subjectOf(f),
    text: emailText(f, at),
    ...(f.email ? { reply_to: f.email } : {}),
  };
}
