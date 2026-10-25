import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UserRole, UserStatus } from '../types/shared.js';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  type?: 'access' | '2fa_pending' | 'password_reset';
}

export class TokenService {
  /**
   * Generates a fully-authenticated access token (after password + 2FA)
   */
  public static generateAccessToken(user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    status: UserStatus;
  }): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      type: 'access',
    };

    return jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
      issuer: 'Nina International Auth Engine',
    });
  }

  /**
   * Generates a restricted temporary token during login before 2FA is completed
   */
  public static generate2FAPendingToken(user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    status: UserStatus;
  }): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      type: '2fa_pending',
    };

    return jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: '10m', // 10 minutes to finish 2FA challenge
      issuer: 'Nina International 2FA Gate',
    });
  }

  /**
   * Generates a single-use password reset token
   */
  public static generatePasswordResetToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'password_reset' },
      ENV.JWT_SECRET,
      { expiresIn: '30m' }
    );
  }

  /**
   * Verifies any token and validates expected token type
   */
  public static verifyToken(token: string, expectedType: 'access' | '2fa_pending' | 'password_reset' = 'access'): TokenPayload {
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
      if (decoded.type !== expectedType) {
        throw new Error(`Invalid token type: expected ${expectedType}, got ${decoded.type}`);
      }
      return decoded;
    } catch (err: any) {
      throw new Error(err.message || 'Token verification failed');
    }
  }
}
