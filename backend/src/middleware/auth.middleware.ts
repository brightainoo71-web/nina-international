import { Request, Response, NextFunction } from 'express';
import { TokenService, TokenPayload } from '../services/token.service.js';
import { DatabaseService } from '../services/database.service.js';
import { UserProfile } from '../types/shared.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  userProfile?: UserProfile;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token missing or invalid format',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = TokenService.verifyToken(token, 'access');

    // Verify account is active in database (not suspended or soft-deleted)
    const profile = await DatabaseService.getDocument<UserProfile>('userProfiles', payload.userId);
    if (!profile) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account not found',
      });
    }

    if (profile.status === 'deleted') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This account has been deactivated. Please contact the administrator.',
      });
    }

    if (profile.status === 'suspended') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This account is suspended.',
      });
    }

    req.user = payload;
    req.userProfile = profile;
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message || 'Session expired or invalid',
    });
  }
};
