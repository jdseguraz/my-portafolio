/**
 * Tests for src/lib/auth/session.ts
 * FR-39, FR-40, FR-41, FR-42, FR-43, NFR-08, ADR-15, ADR-21
 *
 * Strict TDD: this file is written RED before the impl exists.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Will be undefined until implementation is written — this is intentional for RED phase.
let signSession: (now?: number) => string;
let verifySession: (token: string | null | undefined, now?: number) => { valid: boolean; exp?: number };

// A valid 32-byte base64url-encoded test secret (32 random bytes → base64url).
// Generated via: Buffer.from(new Array(32).fill(0).map((_, i) => i)).toString('base64url')
const VALID_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';

beforeEach(async () => {
  vi.stubEnv('AUTH_SESSION_SECRET', VALID_SECRET);
  // Dynamic import so each test gets a fresh module state when env is mocked
  const mod = await import('../../src/lib/auth/session');
  signSession = mod.signSession;
  verifySession = mod.verifySession;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('signSession', () => {
  it('returns a two-segment dot-separated base64url string', () => {
    const token = signSession(Date.now());
    const parts = token.split('.');
    expect(parts).toHaveLength(2);
    // Each segment should be non-empty base64url characters
    expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('encodes an exp 7 days from the given now', () => {
    const now = 1_000_000_000_000;
    const token = signSession(now);
    const [payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(payload.exp).toBe(now + sevenDaysMs);
  });

  it('throws when AUTH_SESSION_SECRET is missing', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const mod = await import('../../src/lib/auth/session');
    expect(() => mod.signSession(Date.now())).toThrow();
  });

  it('throws when AUTH_SESSION_SECRET decodes to fewer than 32 bytes (ADR-21)', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    // 10-byte secret (too short)
    vi.stubEnv('AUTH_SESSION_SECRET', Buffer.from('tooshort12').toString('base64url'));
    const mod = await import('../../src/lib/auth/session');
    expect(() => mod.signSession(Date.now())).toThrow(/32 bytes/i);
  });
});

describe('verifySession', () => {
  it('happy path: returns { valid: true, exp } for a fresh token', () => {
    const now = Date.now();
    const token = signSession(now);
    const result = verifySession(token, now);
    expect(result.valid).toBe(true);
    expect(typeof result.exp).toBe('number');
    expect(result.exp).toBeGreaterThan(now);
  });

  it('returns { valid: false } for a tampered signature (middle char)', () => {
    const now = Date.now();
    const token = signSession(now);
    const [payload, sig] = token.split('.');
    // Flip a MIDDLE character of the signature to avoid base64url last-char aliasing.
    const mid = Math.floor(sig.length / 2);
    const tamperedSig = sig.slice(0, mid) + (sig[mid] === 'a' ? 'b' : 'a') + sig.slice(mid + 1);
    const result = verifySession(`${payload}.${tamperedSig}`, now);
    expect(result.valid).toBe(false);
    expect(result.exp).toBeUndefined();
  });

  it('returns { valid: false } for a tampered last char (base64url aliasing guard)', () => {
    // Regression test: the original implementation compared decoded bytes, allowing
    // ~15 of 64 single-char substitutions at the LAST position to decode identically
    // and bypass the check. Canonical-string comparison closes this.
    const now = Date.now();
    const token = signSession(now);
    const [payload, sig] = token.split('.');
    const lastChar = sig[sig.length - 1];
    // Try every base64url char distinct from the original at the last position;
    // none should produce a valid result.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    for (const ch of alphabet) {
      if (ch === lastChar) continue;
      const tampered = sig.slice(0, -1) + ch;
      const result = verifySession(`${payload}.${tampered}`, now);
      expect(result.valid, `last char '${ch}' should NOT validate`).toBe(false);
    }
  });

  it('returns { valid: false } for an expired token (exp <= now)', () => {
    const past = 1_000_000;
    const token = signSession(past);
    // Verify at a time well after expiry
    const result = verifySession(token, Date.now());
    expect(result.valid).toBe(false);
  });

  it('returns { valid: false } for wrong segment count (0 dots)', () => {
    expect(verifySession('nosegment')).toEqual({ valid: false });
  });

  it('returns { valid: false } for wrong segment count (2 dots)', () => {
    expect(verifySession('a.b.c')).toEqual({ valid: false });
  });

  it('returns { valid: false } for a length mismatch in signature (LENGTH GUARD)', () => {
    const now = Date.now();
    const token = signSession(now);
    const [payload] = token.split('.');
    // Provide a 1-byte signature — different length than 32-byte HMAC-SHA256
    const shortSig = Buffer.from([0x01]).toString('base64url');
    expect(verifySession(`${payload}.${shortSig}`, now)).toEqual({ valid: false });
  });

  it('returns { valid: false } for an invalid JSON payload', () => {
    const now = Date.now();
    // Create a valid structure but corrupt the payload bytes
    const badPayload = Buffer.from('not-json!!').toString('base64url');
    const token = signSession(now);
    const [, sig] = token.split('.');
    expect(verifySession(`${badPayload}.${sig}`, now)).toEqual({ valid: false });
  });

  it('returns { valid: false } for null token', () => {
    expect(verifySession(null)).toEqual({ valid: false });
  });

  it('returns { valid: false } for undefined token', () => {
    expect(verifySession(undefined)).toEqual({ valid: false });
  });

  it('returns { valid: false } for empty string token', () => {
    expect(verifySession('')).toEqual({ valid: false });
  });
});
