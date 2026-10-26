import { Response } from 'express';
import { DatabaseService } from '../services/database.service.js';
import { AuditService } from '../services/audit.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserProfile, UserRole } from '../types/shared.js';

export class UserController {
  /**
   * List users
   */
  public static async listUsers(req: AuthenticatedRequest, res: Response) {
    const { role, status, search } = req.query;
    let users = await DatabaseService.getCollection<UserProfile>('userProfiles');

    if (role) {
      users = users.filter(u => u.role === role);
    }
    if (status) {
      users = users.filter(u => u.status === status);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      users = users.filter(
        u =>
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    return res.json({ users });
  }

  /**
   * Soft Delete Account
   */
  public static async softDeleteUser(req: AuthenticatedRequest, res: Response) {
    const { userId } = req.params;
    const { reason } = req.body;
    const admin = req.userProfile!;

    const targetUser = await DatabaseService.getDocument<UserProfile>('userProfiles', userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === admin.id) {
      return res.status(400).json({ error: 'Cannot soft delete your own administrative account.' });
    }

    const now = new Date().toISOString();
    await DatabaseService.updateDocument<UserProfile>('userProfiles', userId, {
      status: 'deleted',
      deletedAt: now,
      deletedBy: admin.id,
      updatedAt: now,
    });

    await AuditService.logEvent({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'USER_SOFT_DELETED',
      resource: `userProfiles/${userId}`,
      outcome: 'success',
      details: { targetUsername: targetUser.username, reason: reason || 'Administrative action' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ message: `Account for ${targetUser.username} soft-deleted successfully.` });
  }

  /**
   * Controlled Account Restoration
   */
  public static async restoreUser(req: AuthenticatedRequest, res: Response) {
    const { userId } = req.params;
    const { reason } = req.body;
    const admin = req.userProfile!;

    const targetUser = await DatabaseService.getDocument<UserProfile>('userProfiles', userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date().toISOString();
    await DatabaseService.updateDocument<UserProfile>('userProfiles', userId, {
      status: 'active',
      deletedAt: null,
      deletedBy: null,
      restoredAt: now,
      restoredBy: admin.id,
      updatedAt: now,
    });

    await AuditService.logEvent({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'USER_RESTORED',
      resource: `userProfiles/${userId}`,
      outcome: 'success',
      details: { targetUsername: targetUser.username, reason: reason || 'Administrative restoration' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ message: `Account for ${targetUser.username} successfully restored to active status.` });
  }

  /**
   * Update User Role
   */
  public static async updateUserRole(req: AuthenticatedRequest, res: Response) {
    const { userId } = req.params;
    const { role } = req.body;
    const admin = req.userProfile!;

    const validRoles: UserRole[] = ['admin', 'teacher', 'staff', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const targetUser = await DatabaseService.getDocument<UserProfile>('userProfiles', userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldRole = targetUser.role;
    await DatabaseService.updateDocument<UserProfile>('userProfiles', userId, {
      role,
      updatedAt: new Date().toISOString(),
    });

    await AuditService.logEvent({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'USER_ROLE_CHANGED',
      resource: `userProfiles/${userId}`,
      outcome: 'success',
      details: { targetUsername: targetUser.username, oldRole, newRole: role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ message: `Role updated from ${oldRole} to ${role}.` });
  }

  /**
   * Toggle 2FA on/off for a user (Admin governance)
   */
  public static async toggleTwoFactor(req: AuthenticatedRequest, res: Response) {
    const { userId } = req.params;
    const { enabled, method } = req.body;
    const admin = req.userProfile!;

    const targetUser = await DatabaseService.getDocument<UserProfile>('userProfiles', userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const twoFactorMethod = enabled ? (method || 'email') : 'none';
    const totpEnabled = enabled && method === 'totp';

    await DatabaseService.updateDocument<UserProfile>('userProfiles', userId, {
      twoFactorMethod,
      totpEnabled,
      updatedAt: new Date().toISOString(),
    });

    await AuditService.logEvent({
      actorId: admin.id,
      actorRole: admin.role,
      action: enabled ? '2FA_ENFORCED_BY_ADMIN' : '2FA_DISABLED_BY_ADMIN',
      resource: `userProfiles/${userId}`,
      outcome: 'success',
      details: { targetUsername: targetUser.username, twoFactorMethod },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      message: `Two-Factor Authentication ${enabled ? 'enabled (' + twoFactorMethod + ')' : 'disabled'} for ${targetUser.username}.`,
      twoFactorMethod,
      totpEnabled,
    });
  }

  /**
   * Manually verify email for a user (Admin governance)
   */
  public static async manualVerifyEmail(req: AuthenticatedRequest, res: Response) {
    const { userId } = req.params;
    const admin = req.userProfile!;

    const targetUser = await DatabaseService.getDocument<UserProfile>('userProfiles', userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await DatabaseService.updateDocument<UserProfile>('userProfiles', userId, {
      emailVerified: true,
      updatedAt: new Date().toISOString(),
    });

    await AuditService.logEvent({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'EMAIL_VERIFIED_BY_ADMIN',
      resource: `userProfiles/${userId}`,
      outcome: 'success',
      details: { targetUsername: targetUser.username, targetEmail: targetUser.email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ message: `Email address for ${targetUser.username} marked as verified.` });
  }
}
