import { Response } from 'express';
import { BackupService } from '../services/backup.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ENV } from '../config/env.js';

export class BackupController {
  public static async listBackups(req: AuthenticatedRequest, res: Response) {
    const jobs = await BackupService.listBackups();
    const isAwsConfigured =
      ENV.AWS_S3_BACKUP_BUCKET &&
      !ENV.AWS_S3_BACKUP_BUCKET.includes('PLACEHOLDER') &&
      ENV.AWS_ACCESS_KEY_ID &&
      !ENV.AWS_ACCESS_KEY_ID.includes('PLACEHOLDER');

    return res.json({
      jobs,
      awsIntegrationStatus: {
        configured: !!isAwsConfigured,
        region: ENV.AWS_REGION,
        s3Bucket: isAwsConfigured ? ENV.AWS_S3_BACKUP_BUCKET : 'NOT_YET_CONNECTED',
        kmsEncryptionEnabled: !!(ENV.AWS_KMS_KEY_ID && !ENV.AWS_KMS_KEY_ID.includes('PLACEHOLDER')),
        statusMessage: isAwsConfigured
          ? 'AWS S3 Cloud Destination Connected and Active'
          : 'Backups currently staged locally with AES-256-GCM encryption. Pending client AWS S3 credentials.',
      },
    });
  }

  public static async triggerBackup(req: AuthenticatedRequest, res: Response) {
    try {
      const job = await BackupService.executeBackup({
        type: 'manual',
        initiatedBy: req.userProfile!.id,
      });
      return res.status(201).json({ message: 'Backup successfully executed and verified.', job });
    } catch (err: any) {
      return res.status(500).json({ error: 'Backup Failed', message: err.message });
    }
  }

  public static async verifyBackupIntegrity(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    try {
      const result = await BackupService.testRestoreIntegrity(id, req.userProfile!.id);
      return res.json({ message: 'Backup archive integrity verified.', ...result });
    } catch (err: any) {
      return res.status(400).json({ error: 'Verification Failed', message: err.message });
    }
  }
}
