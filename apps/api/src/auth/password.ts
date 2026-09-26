import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id password hashing parameters configured for high security and performance
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, {
    memoryCost: 19456, // 19 MB
    timeCost: 2,       // 2 iterations
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, plainPassword: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plainPassword);
  } catch (err) {
    return false;
  }
}
