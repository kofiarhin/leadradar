import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export interface ScryptParams {
  /** CPU/memory cost. */
  N: number;
  /** Block size. */
  r: number;
  /** Parallelization. */
  p: number;
}

/**
 * OWASP-aligned baseline (Password Storage Cheat Sheet): N = 2^17, r = 8, p = 1.
 *
 * Raising these later is safe: every stored hash carries the parameters it was
 * created with, so existing passwords keep verifying under their original cost.
 */
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = { N: 2 ** 17, r: 8, p: 1 };

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const ALGORITHM = 'scrypt';

/** scrypt needs roughly 128 * N * r bytes; Node's 32 MB default is too low for our N. */
function maxmemFor({ N, r }: ScryptParams): number {
  return 256 * N * r;
}

function derive(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  return scrypt(password, salt, KEY_BYTES, { ...params, maxmem: maxmemFor(params) });
}

/**
 * Hashes a password as `scrypt$N$r$p$saltB64$hashB64`.
 *
 * Every call draws a fresh random salt, so the same password never produces the same
 * stored value. The encoding is self-describing, leaving room for an `argon2id$...`
 * variant later without migrating existing records.
 */
export async function hashPassword(
  password: string,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await derive(password, salt, params);

  return [
    ALGORITHM,
    params.N,
    params.r,
    params.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

/**
 * Verifies a password against a stored hash using the parameters recorded in that
 * hash. Comparison is timing-safe. A malformed or unrecognized stored value returns
 * false rather than throwing, so a corrupt record cannot become a 500.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6) {
    return false;
  }

  const [algorithm, rawN, rawR, rawP, rawSalt, rawHash] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  if (algorithm !== ALGORITHM) {
    return false;
  }

  const params: ScryptParams = { N: Number(rawN), r: Number(rawR), p: Number(rawP) };
  if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) {
    return false;
  }

  const salt = Buffer.from(rawSalt, 'base64');
  const expected = Buffer.from(rawHash, 'base64');
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  let derived: Buffer;
  try {
    derived = await derive(password, salt, params);
  } catch {
    return false;
  }

  // timingSafeEqual throws on a length mismatch, so the length check comes first.
  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
