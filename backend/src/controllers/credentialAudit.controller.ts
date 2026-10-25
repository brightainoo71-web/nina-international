import { Response } from 'express';
import { DatabaseService } from '../services/database.service.js';
import { CredentialService } from '../services/credential.service.js';
import { AuditService } from '../services/audit.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserProfile, PrivateCredentialMetadata } from '../types/shared.js';
import { ENV } from '../config/env.js';

export class CredentialAuditController {
  /**
   * Retrieves credential audit records for authorized security administrators
   * Requires recent re-authentication / verification check
   */
  public static async getAuditRecords(req: AuthenticatedRequest, res: Response) {
    const adminUser = req.userProfile!;

    // Log the sensitive inspection event
    await AuditService.logEvent({
      actorId: adminUser.id,
      actorRole: 'admin',
      actorEmail: adminUser.email,
      action: 'CREDENTIAL_AUDIT_ACCESSED',
      resource: 'privateCredentials/audit',
      outcome: 'success',
      details: { accessLevel: 'ADMIN_ACADEMIC_AUDIT' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const userProfiles = await DatabaseService.getCollection<UserProfile>('userProfiles');
    const privateCreds = await DatabaseService.getCollection<PrivateCredentialMetadata>('privateCredentials');

    const auditList = userProfiles.map(u => {
      const cred = privateCreds.find(c => c.userId === u.id);
      return {
        userId: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        emailVerified: u.emailVerified,
        twoFactorEnabled: u.totpEnabled,
        algorithm: cred?.algorithm || 'argon2id',
        libraryVersion: cred?.libraryVersion || '@node-rs/argon2 v2.0.2',
        hashParams: cred?.hashParams || {
          memoryCost: ENV.ARGON2_MEMORY_COST,
          timeCost: ENV.ARGON2_TIME_COST,
          parallelism: ENV.ARGON2_PARALLELISM,
          hashLength: 32,
        },
        salt: cred?.salt || 'UNAVAILABLE',
        storedHash: cred?.storedHash || 'UNAVAILABLE',
        pepperConfigured: cred?.pepperConfigured ?? true,
        pepperKeyId: cred?.pepperVersion || ENV.PEPPER_KEY_ID,
        pepperValueStatus: '[PROTECTED IN AWS SECRETS MANAGER / SERVER ENVIRONMENT]',
        createdAt: cred?.createdAt || u.createdAt,
        updatedAt: cred?.updatedAt || u.updatedAt,
        lastVerifiedAt: cred?.lastVerifiedAt || null,
        requiresRehash: cred?.requiresRehash ?? false,
      };
    });

    return res.json({
      auditList,
      systemPepperStatus: {
        configured: true,
        activeKeyId: ENV.PEPPER_KEY_ID,
        storageMechanism: 'Server-Side Secret / AWS Secrets Manager (Never sent to client)',
        algorithm: 'HMAC-SHA256 prehash + Argon2id v19',
      },
    });
  }

  /**
   * Educational Synthetic Lab demonstration:
   * Accepts a synthetic demonstration string and executes live HMAC pepper + unique salt + Argon2id hashing
   */
  public static async runSyntheticLabDemo(req: AuthenticatedRequest, res: Response) {
    const { syntheticInput } = req.body;
    const testInput = (syntheticInput && typeof syntheticInput === 'string' && syntheticInput.length > 0)
      ? syntheticInput.slice(0, 50)
      : 'NinaAcademicDemo2026!';

    const demo = await CredentialService.generateEducationalDemo(testInput);

    await AuditService.logEvent({
      actorId: req.userProfile!.id,
      actorRole: 'admin',
      action: 'SYNTHETIC_CREDENTIAL_LAB_RUN',
      resource: 'credentialAudit/syntheticLab',
      outcome: 'success',
      details: { syntheticLength: testInput.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json(demo);
  }
}
