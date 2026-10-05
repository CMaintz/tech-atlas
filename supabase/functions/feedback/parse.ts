/**
 * The `feedback` request: its limits and its validation. `website` is a
 * honeypot: a bot that fills it gets the same success answer and nothing is stored.
 */
import { type Lang, langError } from "../_shared/lang.ts";

export const CATEGORIES = ["bug", "content", "idea", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_EMAIL_CHARS = 254;
export const MAX_PAGE_CHARS = 500;

export type Feedback = {
  category: Category;
  message: string;
  email: string | null;
  page: string | null;
  lang: Lang;
};

/** Deliberately loose: one @, a dot in the domain, no spaces or angle brackets. */
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;

export const isEmail = (s: string) =>
  s.length <= MAX_EMAIL_CHARS && EMAIL.test(s);

type Fields = Record<string, unknown>;

/**
 * Validate the JSON body. `honeypot` is true when the hidden field was filled; the
 * caller then answers success without doing anything.
 */
export function parseFeedback(
  body: unknown,
):
  | { ok: true; honeypot: boolean; value: Feedback }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "expected a JSON object" };
  }
  const fields = body as Fields;
  const error = firstError(fields);
  if (error) return { ok: false, error };
  const { website } = fields;
  return {
    ok: true,
    honeypot: typeof website === "string" && website.trim() !== "",
    value: toFeedback(fields),
  };
}

/** Each field's check, in the order the errors are reported. */
const CHECKS: [string, (value: unknown) => string | null][] = [
  ["category", categoryError],
  ["message", messageError],
  ["email", emailError],
  ["page", pageError],
  ["lang", langError],
];

function firstError(fields: Fields): string | null {
  for (const [name, check] of CHECKS) {
    const error = check(fields[name]);
    if (error) return error;
  }
  return null;
}

function categoryError(category: unknown): string | null {
  if (
    typeof category === "string" &&
    (CATEGORIES as readonly string[]).includes(category)
  ) {
    return null;
  }
  return `\`category\` must be one of ${CATEGORIES.join(", ")}`;
}

function messageError(message: unknown): string | null {
  if (typeof message !== "string" || !message.trim()) {
    return "`message` must be a non-empty string";
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return `\`message\` is longer than ${MAX_MESSAGE_CHARS} characters`;
  }
  return null;
}

const isOptionalString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string";

function emailError(email: unknown): string | null {
  if (!isOptionalString(email)) return "`email` must be a string";
  const mail = typeof email === "string" ? email.trim() : "";
  if (mail && !isEmail(mail)) return "`email` is not an email address";
  return null;
}

function pageError(page: unknown): string | null {
  if (!isOptionalString(page)) return "`page` must be a string";
  if (typeof page === "string" && page.length > MAX_PAGE_CHARS) {
    return `\`page\` is longer than ${MAX_PAGE_CHARS} characters`;
  }
  return null;
}

/** The validated fields, trimmed; a blank email or page becomes null. */
function toFeedback(fields: Fields): Feedback {
  const { category, message, email, page, lang } = fields;
  const trimmed = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  return {
    category: category as Category,
    message: (message as string).trim(),
    email: trimmed(email),
    page: trimmed(page),
    lang: lang as Lang,
  };
}
