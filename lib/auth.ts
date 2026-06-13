// Simple single-user password gate (Cole's auth choice).
// A correct password mints an HMAC-signed, httpOnly session cookie; middleware
// verifies it on every request. Uses Web Crypto only, so it runs in both the
// Edge middleware and Node server actions with no extra dependency.
//
// Secrets (APP_PASSWORD, SESSION_SECRET) come from .env.local and are left as
// placeholders for Cole. In NON-production, if they're unset we fall back to
// documented dev values so the gate is testable locally; in production a missing
// password fails CLOSED (login impossible) rather than open.

export const COOKIE_NAME = "rubicon_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, seconds

const DEV_SESSION_SECRET = "dev-only-insecure-session-secret-change-me";
const DEV_APP_PASSWORD = "rubicon-dev";

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (!isProd()) return DEV_SESSION_SECRET;
  throw new Error("SESSION_SECRET is not set (required in production).");
}

/** The configured gate password, or null if none is set in production (fail closed). */
export function getAppPassword(): string | null {
  const pw = process.env.APP_PASSWORD;
  if (pw) return pw;
  if (!isProd()) return DEV_APP_PASSWORD;
  return null;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

/** Constant-time string compare — no early exit, no length-based timing leak. */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let result = a.length ^ b.length; // nonzero if lengths differ
  for (let i = 0; i < len; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

export function verifyPassword(submitted: string, expected: string): boolean {
  return safeEqual(submitted, expected);
}

/**
 * Return `raw` only if it is a safe same-origin absolute path, else `fallback`.
 * Rejects protocol-relative (`//evil`), backslash tricks (`/\evil`), and any
 * value that resolves to a different origin — closing the login open-redirect.
 */
export function safeInternalPath(raw: unknown, fallback = "/"): string {
  const value = typeof raw === "string" ? raw : "";
  if (!value.startsWith("/")) return fallback;
  try {
    const base = "http://internal.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Mint a signed session token: `v1.<issuedAtMs>.<hmac>`. */
export async function createSessionToken(): Promise<string> {
  const payload = `v1.${Date.now()}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

/** Verify a session token's signature and age. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;

  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);

  const expected = await hmac(payload);
  if (!safeEqual(sig, expected)) return false;

  const parts = payload.split(".");
  const issuedAt = Number(parts[1]);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > SESSION_MAX_AGE * 1000) return false;

  return true;
}
