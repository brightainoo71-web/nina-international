import crypto from 'crypto';
import { DatabaseService } from './database.service.js';
import { AuditService } from './audit.service.js';
import { ConfigurationSnapshot } from '../types/shared.js';

export class ConfigSnapshotService {
  /**
   * Returns current active system configuration
   */
  public static async getCurrentSettings(): Promise<ConfigurationSnapshot['settings']> {
    const current = await DatabaseService.getDocument<any>('systemSettings', 'global');
    if (current && current.settings) {
      return current.settings;
    }
    // Default system configuration
    return {
      schoolName: 'Nina International School',
      academicYear: '2026-2027',
      allowRegistration: true,
      requireTwoFactor: true,
      sessionTimeoutMinutes: 120,
      passwordPolicy: {
        minLength: 10,
        requireNumbers: true,
        requireSymbols: true,
      },
    };
  }

  /**
   * Creates a tamper-evident configuration snapshot
   */
  public static async createSnapshot(params: {
    description: string;
    createdBy: string;
    createdByName?: string;
  }): Promise<ConfigurationSnapshot> {
    const currentSettings = await this.getCurrentSettings();
    const id = `cfg_snap_${Date.now()}`;
    const version = `v${Date.now().toString().slice(-6)}`;
    const createdAt = new Date().toISOString();

    // Calculate integrity hash
    const contentToHash = JSON.stringify({ version, settings: currentSettings });
    const integrityHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

    const snapshot: ConfigurationSnapshot = {
      id,
      version,
      description: params.description,
      createdAt,
      createdBy: params.createdBy,
      createdByName: params.createdByName,
      categories: ['schoolSettings', 'securityPolicy', 'passwordPolicy', 'academicDefaults'],
      settings: currentSettings,
      integrityHash,
      restorationCount: 0,
    };

    await DatabaseService.setDocument('configurationSnapshots', id, snapshot);

    await AuditService.logEvent({
      actorId: params.createdBy,
      actorRole: 'admin',
      action: 'CONFIG_SNAPSHOT_CREATED',
      resource: `configurationSnapshots/${id}`,
      outcome: 'success',
      details: { version, description: params.description, integrityHash },
    });

    return snapshot;
  }

  /**
   * Lists all configuration restore points
   */
  public static async listSnapshots(): Promise<ConfigurationSnapshot[]> {
    const snapshots = await DatabaseService.getCollection<ConfigurationSnapshot>('configurationSnapshots');
    snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return snapshots;
  }

  /**
   * Previews changes between current settings and snapshot target
   */
  public static async previewDiff(snapshotId: string): Promise<{
    currentSettings: ConfigurationSnapshot['settings'];
    targetSettings: ConfigurationSnapshot['settings'];
    diff: Record<string, { current: any; target: any }>;
  }> {
    const snapshot = await DatabaseService.getDocument<ConfigurationSnapshot>('configurationSnapshots', snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const currentSettings = await this.getCurrentSettings();
    const diff: Record<string, { current: any; target: any }> = {};

    const keys = Object.keys(snapshot.settings) as (keyof ConfigurationSnapshot['settings'])[];
    for (const key of keys) {
      const curVal = currentSettings[key];
      const targetVal = snapshot.settings[key];
      if (JSON.stringify(curVal) !== JSON.stringify(targetVal)) {
        diff[String(key)] = {
          current: curVal,
          target: targetVal,
        };
      }
    }

    return {
      currentSettings,
      targetSettings: snapshot.settings,
      diff,
    };
  }

  /**
   * Restores a configuration snapshot safely:
   * 1. Verifies integrity hash
   * 2. Automatically takes an emergency rollback snapshot of current settings
   * 3. Applies new configuration ONLY (never touches student/grade data)
   * 4. Logs to security audit
   */
  public static async restoreSnapshot(params: {
    snapshotId: string;
    actorId: string;
    actorName?: string;
    reason: string;
  }): Promise<{ restoredSnapshot: ConfigurationSnapshot; rollbackSnapshotId: string }> {
    const targetSnapshot = await DatabaseService.getDocument<ConfigurationSnapshot>(
      'configurationSnapshots',
      params.snapshotId
    );
    if (!targetSnapshot) {
      throw new Error('Restore Point not found.');
    }

    // Verify integrity hash
    const expectedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ version: targetSnapshot.version, settings: targetSnapshot.settings }))
      .digest('hex');

    if (expectedHash !== targetSnapshot.integrityHash) {
      await AuditService.logEvent({
        actorId: params.actorId,
        actorRole: 'admin',
        action: 'CONFIG_RESTORE_INTEGRITY_FAILED',
        resource: `configurationSnapshots/${params.snapshotId}`,
        outcome: 'failure',
        details: { reason: 'Integrity hash mismatch detected. Snapshot may have been altered.' },
      });
      throw new Error('Integrity verification failed: Snapshot checksum does not match stored hash.');
    }

    // 1. Create automatic rollback snapshot of current settings
    const current = await this.getCurrentSettings();
    const rollbackSnap = await this.createSnapshot({
      description: `Auto rollback pre-restore of ${targetSnapshot.version} (${params.reason})`,
      createdBy: params.actorId,
      createdByName: params.actorName,
    });

    // 2. Apply new configuration to global settings
    await DatabaseService.setDocument('systemSettings', 'global', {
      id: 'global',
      settings: targetSnapshot.settings,
      updatedAt: new Date().toISOString(),
      updatedBy: params.actorId,
    });

    // 3. Increment restoration counter on target snapshot
    await DatabaseService.updateDocument<ConfigurationSnapshot>('configurationSnapshots', params.snapshotId, {
      restorationCount: (targetSnapshot.restorationCount || 0) + 1,
      lastRestoredAt: new Date().toISOString(),
    });

    // 4. Log detailed audit event
    await AuditService.logEvent({
      actorId: params.actorId,
      actorRole: 'admin',
      action: 'CONFIG_SNAPSHOT_RESTORED',
      resource: `configurationSnapshots/${params.snapshotId}`,
      outcome: 'success',
      details: {
        restoredVersion: targetSnapshot.version,
        reason: params.reason,
        rollbackSnapshotId: rollbackSnap.id,
      },
    });

    return {
      restoredSnapshot: targetSnapshot,
      rollbackSnapshotId: rollbackSnap.id,
    };
  }
}

