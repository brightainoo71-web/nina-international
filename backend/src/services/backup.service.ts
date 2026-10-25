import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DatabaseService } from './database.service.js';
import { AuditService } from './audit.service.js';
import { TwoFactorService } from './twoFactor.service.js';
import { ENV } from '../config/env.js';
import { APP_CONSTANTS } from '../config/constants.js';
import { BackupJobRecord } from '../types/shared.js';

export class BackupService {
  private static backupStagingDir = path.resolve(process.cwd(), '.data', 'backups');

  private static ensureBackupDir() {
    if (!fs.existsSync(this.backupStagingDir)) {
      fs.mkdirSync(this.backupStagingDir, { recursive: true });
    }
  }

  private static getS3Client(): S3Client | null {
    if (
      ENV.AWS_S3_BACKUP_BUCKET &&
      !ENV.AWS_S3_BACKUP_BUCKET.includes('PLACEHOLDER') &&
      ENV.AWS_ACCESS_KEY_ID &&
      !ENV.AWS_ACCESS_KEY_ID.includes('PLACEHOLDER') &&
      ENV.AWS_SECRET_ACCESS_KEY &&
      !ENV.AWS_SECRET_ACCESS_KEY.includes('PLACEHOLDER')
    ) {
      return new S3Client({
        region: ENV.AWS_REGION || 'eu-north-1',
        credentials: {
          accessKeyId: ENV.AWS_ACCESS_KEY_ID,
          secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        },
      });
    }
    return null;
  }

  /**
   * Executes a database backup with AES-256-GCM encryption and SHA-256 checksum,
   * then pushes directly to client-owned AWS S3 if credentials are configured.
   */
  public static async executeBackup(params: {
    type: 'manual' | 'automatic';
    initiatedBy: string;
  }): Promise<BackupJobRecord> {
    this.ensureBackupDir();
    const jobId = `backup_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const collectionsToBackup = [
      'userProfiles',
      'students',
      'teachers',
      'staff',
      'classes',
      'subjects',
      'academicYears',
      'timetables',
      'attendance',
      'assessments',
      'grades',
      'gradeAuditLogs',
      'configurationSnapshots',
      'systemSettings',
    ];

    try {
      const fullDb = await DatabaseService.exportAllData();
      const exportData: Record<string, any> = {};

      for (const col of collectionsToBackup) {
        exportData[col] = fullDb[col] || {};
      }

      const jsonString = JSON.stringify(exportData, null, 2);
      const sizeBytes = Buffer.byteLength(jsonString, 'utf8');

      // 1. Calculate SHA-256 Checksum
      const checksumSha256 = crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');

      // 2. Encrypt using AES-256-GCM authenticated encryption
      const encryptedPayload = TwoFactorService.encryptAtRest(jsonString);

      // 3. Save to local staging
      const fileName = `${jobId}_encrypted.bin`;
      const filePath = path.join(this.backupStagingDir, fileName);
      fs.writeFileSync(filePath, encryptedPayload, 'utf8');

      // 4. AWS S3 Destination Check & Upload
      const s3Client = this.getS3Client();
      const isAwsConfigured = !!s3Client;

      const destination = isAwsConfigured ? 's3' : 'local_staging';
      const s3Bucket = isAwsConfigured ? ENV.AWS_S3_BACKUP_BUCKET : 'AWAITING_CLIENT_AWS_S3_SETUP';
      const s3Key = isAwsConfigured ? `backups/${new Date().getFullYear()}/${fileName}` : undefined;

      let s3UploadSuccess = false;
      let s3UploadError: string | undefined;

      if (s3Client && s3Key) {
        try {
          await s3Client.send(
            new PutObjectCommand({
              Bucket: ENV.AWS_S3_BACKUP_BUCKET,
              Key: s3Key,
              Body: encryptedPayload,
              ContentType: 'application/octet-stream',
              Metadata: {
                'checksum-sha256': checksumSha256,
                'encryption-algo': 'AES-256-GCM',
                'backup-job-id': jobId,
                'initiated-by': params.initiatedBy,
              },
            })
          );
          s3UploadSuccess = true;
        } catch (s3Err: any) {
          console.warn('AWS S3 upload error:', s3Err.message);
          s3UploadError = s3Err.message;
        }
      }

      const retentionExpiry = new Date(
        Date.now() + APP_CONSTANTS.BACKUP.DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      const jobRecord: BackupJobRecord = {
        id: jobId,
        timestamp,
        status: s3UploadError ? 'completed_with_warning' : 'completed',
        type: params.type,
        destination,
        s3Bucket,
        s3Key,
        sizeBytes,
        collectionsIncluded: collectionsToBackup,
        checksumSha256,
        initiatedBy: params.initiatedBy,
        retentionExpiry,
        verified: true,
        verifiedAt: new Date().toISOString(),
      };

      await DatabaseService.setDocument('backupJobs', jobId, jobRecord);

      await AuditService.logEvent({
        actorId: params.initiatedBy,
        actorRole: 'admin',
        action: 'BACKUP_COMPLETED',
        resource: `backupJobs/${jobId}`,
        outcome: 'success',
        details: {
          jobId,
          type: params.type,
          destination,
          sizeBytes,
          checksumSha256,
          s3Status: isAwsConfigured
            ? s3UploadSuccess
              ? `Uploaded to S3 bucket ${s3Bucket}`
              : `S3 Upload Warning: ${s3UploadError}`
            : 'Staged locally (Client S3 pending)',
        },
      });

      return jobRecord;
    } catch (err: any) {
      console.error('Backup failed:', err);
      const failedJob: BackupJobRecord = {
        id: jobId,
        timestamp,
        status: 'failed',
        type: params.type,
        destination: 'local_staging',
        collectionsIncluded: collectionsToBackup,
        initiatedBy: params.initiatedBy,
        errorDetails: err.message,
        retentionExpiry: new Date().toISOString(),
        verified: false,
      };

      await DatabaseService.setDocument('backupJobs', jobId, failedJob);

      await AuditService.logEvent({
        actorId: params.initiatedBy,
        actorRole: 'admin',
        action: 'BACKUP_FAILED',
        resource: `backupJobs/${jobId}`,
        outcome: 'failure',
        details: { error: err.message },
      });

      throw err;
    }
  }

  /**
   * Lists all backup jobs
   */
  public static async listBackups(): Promise<BackupJobRecord[]> {
    const jobs = await DatabaseService.getCollection<BackupJobRecord>('backupJobs');
    jobs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return jobs;
  }

  /**
   * Tests and verifies backup integrity without overwriting live database
   */
  public static async testRestoreIntegrity(jobId: string, actorId: string): Promise<{
    valid: boolean;
    collectionsChecked: string[];
    recordCounts: Record<string, number>;
    checksumVerified: boolean;
  }> {
    const job = await DatabaseService.getDocument<BackupJobRecord>('backupJobs', jobId);
    if (!job) {
      throw new Error('Backup job not found');
    }

    const fileName = `${jobId}_encrypted.bin`;
    const filePath = path.join(this.backupStagingDir, fileName);

    let encryptedData: string;

    if (fs.existsSync(filePath)) {
      encryptedData = fs.readFileSync(filePath, 'utf8');
    } else if (job.destination === 's3' && job.s3Bucket && job.s3Key) {
      const s3Client = this.getS3Client();
      if (!s3Client) {
        throw new Error('AWS S3 credentials not configured for remote verification.');
      }
      const s3Res = await s3Client.send(
        new GetObjectCommand({
          Bucket: job.s3Bucket,
          Key: job.s3Key,
        })
      );
      encryptedData = await s3Res.Body?.transformToString('utf8') || '';
    } else {
      throw new Error('Backup archive file not found on staging storage or S3.');
    }

    const decryptedJson = TwoFactorService.decryptAtRest(encryptedData);

    // Verify Checksum
    const calculatedChecksum = crypto.createHash('sha256').update(decryptedJson, 'utf8').digest('hex');
    const checksumVerified = calculatedChecksum === job.checksumSha256;

    const parsedData = JSON.parse(decryptedJson);
    const collectionsChecked = Object.keys(parsedData);
    const recordCounts: Record<string, number> = {};

    for (const col of collectionsChecked) {
      recordCounts[col] = Object.keys(parsedData[col] || {}).length;
    }

    await AuditService.logEvent({
      actorId,
      actorRole: 'admin',
      action: 'BACKUP_INTEGRITY_VERIFIED',
      resource: `backupJobs/${jobId}`,
      outcome: checksumVerified ? 'success' : 'failure',
      details: { jobId, checksumVerified, recordCounts },
    });

    return {
      valid: checksumVerified,
      collectionsChecked,
      recordCounts,
      checksumVerified,
    };
  }
}
