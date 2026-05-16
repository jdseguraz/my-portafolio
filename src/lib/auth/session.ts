/**
 * Session token signing and verification via HMAC-SHA256.
 * ADR-15, ADR-18, ADR-21
 *
 * Pure module — NO 'import server-only'.
 * Auth secret is read lazily (inside getSecret()) so:
 *   1. Build succeeds without the env var present.
 *   2. Vitest tests can stub process.env before the first call.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

/** Reads and validates AUTH_SESSION_SECRET. Throws on missing or weak secret (ADR-21). */
function getSecret(): Buffer {
  const raw = process.env.AUTH_SESSION_SECRET;
  if (!raw) {
    throw new Error('AUTH_SESSION_SECRET is not set');
  }
  const decoded = fromB64url(raw);
  if (decoded.length < 32) {
    throw new Error('AUTH_SESSION_SECRET must decode to >= 32 bytes (ADR-21)');
  }
  return decoded;
}

/**
 * Signs a new session token with a 7-day expiration.
 * @param now  Current timestamp in ms (injectable for testing). Defaults to Date.now().
 * @returns Two-segment dot-separated base64url string: <payload>.<signature>
 */
export function signSession(now: number = Date.now()): string {
  const payload = { exp: now + SEVEN_DAYS_MS };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac('sha256', getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

/**
 * Verifies a session token.
 * @param token  Cookie value (may be null/undefined).
 * @param now    Current timestamp in ms (injectable for testing). Defaults to Date.now().
 * @returns { valid: true, exp } on success; { valid: false } on any failure.
 */
export function verifySession(
  token: string | null | undefined,
  now: number = Date.now(),
): { valid: boolean; exp?: number } {
  if (!token || typeof token !== 'string') return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [payloadB64, sigB64] = parts;

  const expected = createHmac('sha256', getSecret()).update(payloadB64).digest();
  const expectedB64 = b64url(expected);

  // String comparison on canonical base64url form. Comparing the decoded BYTES would
  // accept tampered last characters whose 4 padding bits decode to the same buffer
  // (base64url last-char aliasing). The string form is one-to-one with the HMAC.
  if (sigB64.length !== expectedB64.length) return { valid: false };

  if (!timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedB64))) {
    return { valid: false };
  }

  let parsed: { exp?: number };
  try {
    parsed = JSON.parse(fromB64url(payloadB64).toString('utf8'));
  } catch {
    return { valid: false };
  }

  if (typeof parsed.exp !== 'number' || parsed.exp <= now) return { valid: false };

  return { valid: true, exp: parsed.exp };
}
