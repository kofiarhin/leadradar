import { DEFAULT_SCRYPT_PARAMS, hashPassword, verifyPassword } from './password';

/** Cheap parameters keep the suite fast; production defaults are asserted separately. */
const testParams = { N: 1024, r: 8, p: 1 };

describe('password hashing', () => {
  it('produces a self-describing hash that is not the plaintext', async () => {
    const stored = await hashPassword('correct horse battery staple', testParams);

    expect(stored).not.toContain('correct horse battery staple');
    expect(stored.startsWith('scrypt$')).toBe(true);

    const [algorithm, n, r, p, salt, hash] = stored.split('$');
    expect(algorithm).toBe('scrypt');
    expect(Number(n)).toBe(testParams.N);
    expect(Number(r)).toBe(testParams.r);
    expect(Number(p)).toBe(testParams.p);
    expect(salt).toBeTruthy();
    expect(hash).toBeTruthy();
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const stored = await hashPassword('right-password', testParams);

    await expect(verifyPassword('right-password', stored)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', stored)).resolves.toBe(false);
  });

  it('uses a unique random salt for every hash', async () => {
    const first = await hashPassword('same-password', testParams);
    const second = await hashPassword('same-password', testParams);

    expect(first).not.toEqual(second);

    const saltOf = (stored: string): string => stored.split('$')[4] as string;
    expect(saltOf(first)).not.toEqual(saltOf(second));

    await expect(verifyPassword('same-password', first)).resolves.toBe(true);
    await expect(verifyPassword('same-password', second)).resolves.toBe(true);
  });

  it('reads cost parameters from the stored hash, not from current defaults', async () => {
    const stored = await hashPassword('legacy-password', { N: 1024, r: 8, p: 1 });

    // A hash written under weaker parameters must still verify after the baseline rises.
    await expect(verifyPassword('legacy-password', stored)).resolves.toBe(true);
    expect(DEFAULT_SCRYPT_PARAMS.N).toBeGreaterThan(1024);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    await expect(verifyPassword('anything', 'not-a-valid-hash')).resolves.toBe(false);
    await expect(verifyPassword('anything', 'scrypt$1024$8$1$only-five-parts')).resolves.toBe(
      false,
    );
  });

  it('rejects a stored hash whose digest length differs', async () => {
    const stored = await hashPassword('a-password', testParams);
    const [algorithm, n, r, p, salt] = stored.split('$');
    const truncated = [algorithm, n, r, p, salt, 'AAAA'].join('$');

    await expect(verifyPassword('a-password', truncated)).resolves.toBe(false);
  });

  it('defaults to OWASP-aligned parameters', () => {
    expect(DEFAULT_SCRYPT_PARAMS.N).toBeGreaterThanOrEqual(2 ** 17);
    expect(DEFAULT_SCRYPT_PARAMS.r).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_SCRYPT_PARAMS.p).toBeGreaterThanOrEqual(1);
  });
});
