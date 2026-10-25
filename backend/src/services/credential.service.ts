import crypto from 'crypto';
import { hash, verify, Algorithm } from '@node-rs/argon2';
import { ENV } from '../config/env.js';
import { APP_CONSTANTS } from '../config/constants.js';

export interface CredentialHashResult {
  storedHash: string;
  salt: string;
  pepperVersion: string;
  hashParams: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
    hashLength: number;
  };
  requiresRehash: boolean;
}

export class CredentialService {
  private static pepperMap: Record<string, string> = {
    [ENV.PEPPER_KEY_ID]: ENV.PEPPER_SECRET,
  };

  /**
   * Generates a 16-byte cryptographically secure random salt
   */
  public static generateSalt(): Buffer {
    return crypto.randomBytes(16);
  }

  /**
   * Applies the server-side pepper to the plaintext password via keyed HMAC-SHA256
   * Prehash = HMAC-SHA256(Key=Pepper, Data=Password)
   */
  private static applyPepper(password: string, pepperKeyId: string = ENV.PEPPER_KEY_ID): string {
    const pepper = this.pepperMap[pepperKeyId];
    if (!pepper) {
      throw new Error(`Cryptographic Error: Pepper key '${pepperKeyId}' is unrecognized.`);
    }
    return crypto.createHmac('sha256', pepper).update(password, 'utf8').digest('hex');
  }

  /**
   * Creates a secure credential using Unique Salt + Server Pepper + Argon2id
   */
  public static async hashPassword(
    password: string,
    pepperKeyId: string = ENV.PEPPER_KEY_ID
  ): Promise<CredentialHashResult> {
    const saltBuffer = this.generateSalt();
    const prehash = this.applyPepper(password, pepperKeyId);

    const hashParams = {
      algorithm: Algorithm.Argon2id,
      memoryCost: ENV.ARGON2_MEMORY_COST,
      timeCost: ENV.ARGON2_TIME_COST,
      parallelism: ENV.ARGON2_PARALLELISM,
      outputLen: APP_CONSTANTS.ARGON2.HASH_LENGTH,
      salt: saltBuffer,
    };

    const storedHash = await hash(prehash, hashParams);

    return {
      storedHash,
      salt: saltBuffer.toString('hex'),
      pepperVersion: pepperKeyId,
      hashParams: {
        memoryCost: ENV.ARGON2_MEMORY_COST,
        timeCost: ENV.ARGON2_TIME_COST,
        parallelism: ENV.ARGON2_PARALLELISM,
        hashLength: APP_CONSTANTS.ARGON2.HASH_LENGTH,
      },
      requiresRehash: false,
    };
  }

  /**
   * Verifies a password against the stored Argon2id hash using constant-time comparison
   */
  public static async verifyPassword(
    password: string,
    storedHash: string,
    pepperKeyId: string = ENV.PEPPER_KEY_ID
  ): Promise<boolean> {
    try {
      const prehash = this.applyPepper(password, pepperKeyId);
      return await verify(storedHash, prehash);
    } catch (err) {
      console.error('Credential verification error:', err);
      return false;
    }
  }

  /**
   * Checks if credential parameters are outdated and require rehashing
   */
  public static needsRehash(
    storedHash: string,
    pepperKeyId?: string
  ): boolean {
    if (pepperKeyId && pepperKeyId !== ENV.PEPPER_KEY_ID) {
      return true; // Pepper was rotated
    }
    // Check if memory or iteration parameters have changed
    const memoryMatch = storedHash.match(/m=(\d+)/);
    const timeMatch = storedHash.match(/t=(\d+)/);
    if (memoryMatch && parseInt(memoryMatch[1], 10) < ENV.ARGON2_MEMORY_COST) {
      return true;
    }
    if (timeMatch && parseInt(timeMatch[1], 10) < ENV.ARGON2_TIME_COST) {
      return true;
    }
    return false;
  }

  /**
   * Controlled academic demonstration helper:
   * Generates synthetic demonstration of the Pepper -> HMAC -> Salt -> Argon2id pipeline.
   * NEVER use real user passwords with this function.
   */
  public static async generateEducationalDemo(
    syntheticPassword = 'SampleStudentPassword2026!'
  ) {
    const syntheticSalt = crypto.randomBytes(16);
    const pepperMasked = `[PROTECTED SECRET: ${ENV.PEPPER_KEY_ID} in AWS Secrets Manager]`;
    const prehash = crypto
      .createHmac('sha256', ENV.PEPPER_SECRET)
      .update(syntheticPassword, 'utf8')
      .digest('hex');

    const sampleHash = await hash(prehash, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19456, // Slightly lower for instant demo rendering
      timeCost: 2,
      parallelism: 1,
      salt: syntheticSalt,
    });

    return {
      stage1_plaintext: syntheticPassword,
      stage2_pepperApplied: {
        method: 'HMAC-SHA256(Key=ServerPepper, Input=Password)',
        pepperKeyId: ENV.PEPPER_KEY_ID,
        pepperValueStatus: pepperMasked,
        prehashResult: prehash,
      },
      stage3_saltGeneration: {
        saltHex: syntheticSalt.toString('hex'),
        saltBytes: 16,
        description: 'Cryptographically unique 128-bit random salt generated per-credential.',
      },
      stage4_argon2idHash: {
        algorithm: 'Argon2id (v19)',
        memoryCostKiB: 19456,
        timeCostIterations: 2,
        parallelismThreads: 1,
        finalStoredHash: sampleHash,
      },
      educationalNotes: [
        'Salt prevents Rainbow Table attacks and ensures identical passwords yield distinct stored hashes.',
        'Pepper protects hashes even if the database is completely exfiltrated, because the pepper is stored in a separate key management service (e.g. AWS Secrets Manager).',
        'Argon2id provides state-of-the-art resistance to both GPU and side-channel timing attacks.',
        'Password verification is one-way: plaintext cannot be reverse-computed from the hash.',
      ],
    };
  }
}
