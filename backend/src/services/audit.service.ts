import crypto from 'crypto';
import { DatabaseService } from './database.service.js';
import { AuditLogEntry, UserRole } from '../types/shared.js';

export class AuditService {
  private static lastLogHash = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Sanitizes any payload to ensure no sensitive credential material is ever logged
   */
  private static sanitizeDetails(details?: Record<string, any>): Record<string, any> | undefined {
    if (!details) return undefined;
    const sanitized: Record<string, any> = {};
    const prohibitedKeys = [
      'password',
      'passwordConfirm',
      'currentPassword',
      'newPassword',
      'otp',
      'code',
      'token',
      'pepper',
      'secret',
      'privateKey',
      'authTag',
    ];

    for (const [key, value] of Object.entries(details)) {
      if (prohibitedKeys.some(p => key.toLowerCase().includes(p.toLowerCase()))) {
        sanitized[key] = '[REDACTED_CREDENTIAL_DATA]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Records a security event with cryptographic hash chaining for tamper evidence
   */
  public static async logEvent(params: {
    actorId: string;
    actorRole: UserRole | 'anonymous' | 'system';
    actorEmail?: string;
    action: string;
    resource: string;
    outcome: 'success' | 'failure' | 'denied';
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLogEntry> {
    const id = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const sanitizedDetails = this.sanitizeDetails(params.details);

    // Compute tamper-evident hash chaining
    const hashPayload = JSON.stringify({
      id,
      timestamp,
      actorId: params.actorId,
      action: params.action,
      resource: params.resource,
      outcome: params.outcome,
      prevHash: this.lastLogHash,
    });
    const entryHash = crypto.createHash('sha256').update(hashPayload).digest('hex');
    this.lastLogHash = entryHash;

    const entry: AuditLogEntry & { integrityHash: string; prevHash: string } = {
      id,
      timestamp,
      actorId: params.actorId,
      actorRole: params.actorRole,
      actorEmail: params.actorEmail,
      action: params.action,
      resource: params.resource,
      outcome: params.outcome,
      details: sanitizedDetails,
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent || 'system',
      integrityHash: entryHash,
      prevHash: this.lastLogHash,
    };

    await DatabaseService.setDocument('auditLogs', id, entry);
    return entry;
  }

  /**
   * Query audit logs with rich filters
   */
  public static async getLogs(filters?: {
    role?: string;
    action?: string;
    outcome?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    let logs = await DatabaseService.getCollection<AuditLogEntry>('auditLogs');

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.role) {
      logs = logs.filter(l => l.actorRole === filters.role);
    }
    if (filters?.action) {
      logs = logs.filter(l => l.action.toLowerCase().includes(filters.action!.toLowerCase()));
    }
    if (filters?.outcome) {
      logs = logs.filter(l => l.outcome === filters.outcome);
    }
    if (filters?.startDate) {
      logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.startDate!));
    }
    if (filters?.endDate) {
      logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.endDate!));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(
        l =>
          l.action.toLowerCase().includes(q) ||
          l.resource.toLowerCase().includes(q) ||
          (l.actorEmail && l.actorEmail.toLowerCase().includes(q))
      );
    }

    const total = logs.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    const paginated = logs.slice(offset, offset + limit);

    return { logs: paginated, total };
  }
}
