/**
 * Constant-time password comparison using Node's crypto.timingSafeEqual.
 * ADR-18: Pure module — NO 'import server-only'.
 * The expected password is read lazily so env can be stubbed in tests.
 */
import { timingSafeEqual } from 'node:crypto';

/**
 * Checks whether `submitted` matches the ADMIN_PASSWORD env var.
 * Uses a length guard before timingSafeEqual (which requires equal-length buffers).
 * @throws if ADMIN_PASSWORD is not set in the environment.
 */
export function checkPassword(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error('ADMIN_PASSWORD is not set');
  }

  const submittedBuf = Buffer.from(submitted);
  const expectedBuf = Buffer.from(expected);

  // LENGTH GUARD — timingSafeEqual throws if buffers have different byte lengths.
  if (submittedBuf.byteLength !== expectedBuf.byteLength) {
    return false;
  }

  return timingSafeEqual(submittedBuf, expectedBuf);
}
