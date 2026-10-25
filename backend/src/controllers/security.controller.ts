import { Response } from 'express';
import { AuditService } from '../services/audit.service.js';
import { ConfigSnapshotService } from '../services/configSnapshot.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class SecurityController {
  public static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    const { role, action, outcome, search, startDate, endDate, limit, offset } = req.query;
    const data = await AuditService.getLogs({
      role: role as string,
      action: action as string,
      outcome: outcome as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    return res.json(data);
  }

  public static async listSnapshots(req: AuthenticatedRequest, res: Response) {
    const snapshots = await ConfigSnapshotService.listSnapshots();
    return res.json({ snapshots });
  }

  public static async createSnapshot(req: AuthenticatedRequest, res: Response) {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'Description required' });
    }

    const snapshot = await ConfigSnapshotService.createSnapshot({
      description,
      createdBy: req.userProfile!.id,
      createdByName: req.userProfile!.fullName,
    });

    return res.status(201).json({ snapshot });
  }

  public static async previewSnapshot(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    try {
      const preview = await ConfigSnapshotService.previewDiff(id);
      return res.json(preview);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  public static async restoreSnapshot(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Reason for restoration is required for audit records.' });
    }

    try {
      const result = await ConfigSnapshotService.restoreSnapshot({
        snapshotId: id,
        actorId: req.userProfile!.id,
        actorName: req.userProfile!.fullName,
        reason,
      });
      return res.json({
        message: 'Configuration restored successfully. No student or grade data was modified.',
        ...result,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  public static async getSettings(req: AuthenticatedRequest, res: Response) {
    const settings = await ConfigSnapshotService.getCurrentSettings();
    return res.json({ settings });
  }
}
