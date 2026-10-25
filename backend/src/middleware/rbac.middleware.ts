import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { UserRole } from '../types/shared.js';
import { AuditService } from '../services/audit.service.js';

export const requireRole = (allowedRoles: UserRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.userProfile) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const currentRole = req.userProfile.role;
    if (!allowedRoles.includes(currentRole)) {
      // Log unauthorized access attempt
      await AuditService.logEvent({
        actorId: req.user.userId,
        actorRole: currentRole,
        actorEmail: req.user.email,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resource: req.originalUrl,
        outcome: 'denied',
        details: {
          requiredRoles: allowedRoles,
          actualRole: currentRole,
          method: req.method,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of [${allowedRoles.join(', ')}] role.`,
      });
    }

    next();
  };
};

/**
 * Protects Student records so students cannot access another student's profile/grades
 */
export const requireStudentSelfOrStaff = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const currentRole = req.userProfile?.role;
  const currentUserId = req.userProfile?.id;
  const targetStudentUserId = req.params.studentUserId || req.query.studentUserId;

  if (currentRole === 'admin' || currentRole === 'staff' || currentRole === 'teacher') {
    return next();
  }

  if (currentRole === 'student' && targetStudentUserId && targetStudentUserId !== currentUserId) {
    AuditService.logEvent({
      actorId: currentUserId || 'unknown',
      actorRole: 'student',
      action: 'IDOR_ACCESS_ATTEMPT',
      resource: req.originalUrl,
      outcome: 'denied',
      details: { targetStudentUserId, currentUserId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access Denied: You can only view your own student records.',
    });
  }

  next();
};
