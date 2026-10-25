import { Request, Response } from 'express';
import crypto from 'crypto';
import { DatabaseService } from '../services/database.service.js';
import { CredentialService } from '../services/credential.service.js';
import { TwoFactorService } from '../services/twoFactor.service.js';
import { TokenService } from '../services/token.service.js';
import { AuditService } from '../services/audit.service.js';
import { EmailService } from '../services/email.service.js';
import { UserProfile, PrivateCredentialMetadata } from '../types/shared.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  /**
   * User Registration
   */
  public static async register(req: Request, res: Response) {
    const { fullName, username, email, password, role } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'All fields are required.' });
    }

    if (password.length < 10) {
      return res.status(400).json({
        error: 'Weak Password',
        message: 'Password must be at least 10 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    // Check duplicate email
    const existingEmail = await DatabaseService.getCollection<UserProfile>('userProfiles', {
      where: [{ field: 'email', op: '==', value: normalizedEmail }],
    });
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Conflict', message: 'Email address already registered.' });
    }

    // Check duplicate username
    const existingUser = await DatabaseService.getCollection<UserProfile>('userProfiles', {
      where: [{ field: 'username', op: '==', value: normalizedUsername }],
    });
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Conflict', message: 'Username is already taken.' });
    }

    // Role safety: Public registration cannot create admin accounts
    const assignedRole = role === 'teacher' || role === 'staff' ? role : 'student';

    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    // 1. Hash password with unique salt + server-side HMAC pepper via Argon2id
    const credResult = await CredentialService.hashPassword(password);

    // 2. Save private credentials in isolated privateCredentials collection
    const privateCred: PrivateCredentialMetadata & { failedLoginAttempts: number; lockoutUntil?: string | null } = {
      userId,
      algorithm: 'argon2id',
      libraryVersion: '@node-rs/argon2 v2.0.2',
      hashParams: credResult.hashParams,
      salt: credResult.salt,
      storedHash: credResult.storedHash,
      pepperConfigured: true,
      pepperVersion: credResult.pepperVersion,
      createdAt: now,
      updatedAt: now,
      requiresRehash: false,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    };
    await DatabaseService.setDocument('privateCredentials', userId, privateCred);

    // 3. Save User Profile
    const profile: UserProfile = {
      id: userId,
      email: normalizedEmail,
      username: normalizedUsername,
      fullName: fullName.trim(),
      role: assignedRole,
      status: 'active',
      emailVerified: false,
      totpEnabled: false,
      twoFactorMethod: 'none',
      createdAt: now,
      updatedAt: now,
    };
    await DatabaseService.setDocument('userProfiles', userId, profile);

    // If student, create student record
    if (assignedRole === 'student') {
      const studentNumber = `NINA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await DatabaseService.setDocument('students', userId, {
        id: userId,
        userId,
        studentNumber,
        fullName: fullName.trim(),
        email: normalizedEmail,
        guardianName: 'Guardian of ' + fullName.trim(),
        guardianPhone: '+233 24 000 0000',
        guardianEmail: 'guardian.' + normalizedEmail,
        enrolmentStatus: 'enrolled',
        classId: 'class_jhs1',
        className: 'JHS 1 Gold',
        dateOfBirth: '2012-05-15',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 4. Generate verification OTP and send email
    const otp = TwoFactorService.generateEmailOtp();
    await DatabaseService.setDocument('authenticationChallenges', `otp_${userId}`, {
      id: `otp_${userId}`,
      userId,
      type: 'email_verification',
      codeHash: otp.codeHash,
      expiresAt: otp.expiresAt,
      used: false,
    });

    // Send production verification email (or fallback to simulated log)
    const emailResult = await EmailService.sendVerificationOtp(normalizedEmail, fullName.trim(), otp.code);

    await AuditService.logEvent({
      actorId: userId,
      actorRole: assignedRole,
      actorEmail: normalizedEmail,
      action: 'USER_REGISTERED',
      resource: `userProfiles/${userId}`,
      outcome: 'success',
      details: { role: assignedRole, username: normalizedUsername, emailDispatched: emailResult.success },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      message: 'Registration successful. A verification code has been dispatched to your email.',
      userId,
      email: normalizedEmail,
      emailDispatched: !emailResult.simulated,
      simulatedVerificationOtp: otp.code, // Maintained for seamless demo / test inspection
    });
  }

  /**
   * Verify Email
   */
  public static async verifyEmail(req: Request, res: Response) {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: 'Validation Error', message: 'User ID and code are required.' });
    }

    const challenge = await DatabaseService.getDocument<any>('authenticationChallenges', `otp_${userId}`);
    if (!challenge || challenge.used || new Date(challenge.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Expired', message: 'Verification code expired or invalid.' });
    }

    const valid = TwoFactorService.verifyEmailOtp(code, challenge.codeHash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid Code', message: 'Incorrect verification code.' });
    }

    // Mark challenge as used and user email as verified
    await DatabaseService.updateDocument('authenticationChallenges', `otp_${userId}`, { used: true });
    await DatabaseService.updateDocument<UserProfile>('userProfiles', userId, {
      emailVerified: true,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ message: 'Email address verified successfully. You may now log in.' });
  }

  /**
   * Step 1: Login with Email/Username + Password
   */
  public static async login(req: Request, res: Response) {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Identifier and password are required.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const users = await DatabaseService.getCollection<UserProfile>('userProfiles');
    const user = users.find(u => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid Credentials', message: 'Invalid identifier or password.' });
    }

    if (user.status === 'deleted') {
      return res.status(403).json({
        error: 'Account Deactivated',
        message: 'This account has been deactivated. Please contact the administrator.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Account Suspended',
        message: 'This account is currently suspended. Please contact administration.',
      });
    }

    const creds = await DatabaseService.getDocument<any>('privateCredentials', user.id);
    if (!creds || !creds.storedHash) {
      return res.status(500).json({ error: 'Server Error', message: 'Credential record not found.' });
    }

    // Check brute-force lockout
    if (creds.lockoutUntil && new Date(creds.lockoutUntil) > new Date()) {
      return res.status(429).json({
        error: 'Account Locked',
        message: 'Too many failed login attempts. Account locked for 15 minutes.',
      });
    }

    // Verify Argon2id hash using keyed HMAC server pepper
    const passwordValid = await CredentialService.verifyPassword(
      password,
      creds.storedHash,
      creds.pepperVersion
    );

    if (!passwordValid) {
      const attempts = (creds.failedLoginAttempts || 0) + 1;
      const lockout = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await DatabaseService.updateDocument('privateCredentials', user.id, {
        failedLoginAttempts: attempts,
        lockoutUntil: lockout,
      });

      await AuditService.logEvent({
        actorId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        action: 'LOGIN_FAILED_PASSWORD_MISMATCH',
        resource: 'auth/login',
        outcome: 'failure',
        details: { attempts },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({ error: 'Invalid Credentials', message: 'Invalid identifier or password.' });
    }

    // Reset failed attempts on success
    await DatabaseService.updateDocument('privateCredentials', user.id, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastVerifiedAt: new Date().toISOString(),
    });

    // Determine 2FA Requirement
    const requires2FA = user.totpEnabled || user.twoFactorMethod !== 'none';

    if (requires2FA) {
      const pendingToken = TokenService.generate2FAPendingToken(user);
      const availableMethods = [];
      if (user.totpEnabled) availableMethods.push('totp');
      availableMethods.push('email');

      return res.json({
        requires2FA: true,
        twoFactorToken: pendingToken,
        availableMethods,
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
      });
    }

    // If 2FA not required, issue full access token
    const accessToken = TokenService.generateAccessToken(user);
    await DatabaseService.updateDocument<UserProfile>('userProfiles', user.id, {
      lastLoginAt: new Date().toISOString(),
    });

    await AuditService.logEvent({
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      action: 'LOGIN_SUCCESS',
      resource: 'auth/login',
      outcome: 'success',
      details: { twoFactorUsed: false },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      requires2FA: false,
      accessToken,
      user,
    });
  }

  /**
   * Request Email OTP for 2FA Login
   */
  public static async send2FAEmailOtp(req: Request, res: Response) {
    const { twoFactorToken } = req.body;
    if (!twoFactorToken) {
      return res.status(400).json({ error: 'Validation Error', message: 'twoFactorToken is required.' });
    }

    try {
      const payload = TokenService.verifyToken(twoFactorToken, '2fa_pending');
      const user = await DatabaseService.getDocument<UserProfile>('userProfiles', payload.userId);
      const otp = TwoFactorService.generateEmailOtp();

      await DatabaseService.setDocument('authenticationChallenges', `2fa_email_${payload.userId}`, {
        id: `2fa_email_${payload.userId}`,
        userId: payload.userId,
        type: 'email_2fa',
        codeHash: otp.codeHash,
        expiresAt: otp.expiresAt,
        used: false,
      });

      let emailDispatched = false;
      if (user) {
        const result = await EmailService.sendLoginOtp(user.email, user.fullName, otp.code, req.ip);
        emailDispatched = !result.simulated;
      }

      return res.json({
        message: 'Verification code sent to email.',
        emailDispatched,
        simulatedOtp: otp.code, // Surface simulated OTP for fast seamless presentation/demo
      });
    } catch (err: any) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired 2FA token.' });
    }
  }

  /**
   * Step 2: Complete 2FA Verification (TOTP or Email OTP)
   */
  public static async verify2FA(req: Request, res: Response) {
    const { twoFactorToken, method, code } = req.body;

    if (!twoFactorToken || !method || !code) {
      return res.status(400).json({ error: 'Validation Error', message: 'Token, method, and code are required.' });
    }

    let payload;
    try {
      payload = TokenService.verifyToken(twoFactorToken, '2fa_pending');
    } catch (err: any) {
      return res.status(401).json({ error: 'Unauthorized', message: '2FA session has expired. Please log in again.' });
    }

    const user = await DatabaseService.getDocument<UserProfile>('userProfiles', payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User Not Found' });
    }

    let isValid = false;

    if (method === 'totp') {
      const creds = await DatabaseService.getDocument<any>('privateCredentials', user.id);
      if (!creds || !creds.totpSecretEncrypted) {
        return res.status(400).json({ error: 'TOTP not configured for this account.' });
      }
      isValid = TwoFactorService.verifyTotpToken(creds.totpSecretEncrypted, code, user.email);
    } else if (method === 'email') {
      const challenge = await DatabaseService.getDocument<any>(
        'authenticationChallenges',
        `2fa_email_${user.id}`
      );
      if (challenge && !challenge.used && new Date(challenge.expiresAt) > new Date()) {
        isValid = TwoFactorService.verifyEmailOtp(code, challenge.codeHash);
        if (isValid) {
          await DatabaseService.updateDocument('authenticationChallenges', `2fa_email_${user.id}`, { used: true });
        }
      }
    }

    if (!isValid) {
      await AuditService.logEvent({
        actorId: user.id,
        actorRole: user.role,
        actorEmail: user.email,
        action: '2FA_VERIFICATION_FAILED',
        resource: 'auth/2fa',
        outcome: 'failure',
        details: { method },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.status(401).json({ error: 'Verification Failed', message: 'Invalid 2FA code provided.' });
    }

    // Success: Issue final access token
    const accessToken = TokenService.generateAccessToken(user);
    await DatabaseService.updateDocument<UserProfile>('userProfiles', user.id, {
      lastLoginAt: new Date().toISOString(),
    });

    await AuditService.logEvent({
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      action: '2FA_VERIFICATION_SUCCESS',
      resource: 'auth/2fa',
      outcome: 'success',
      details: { method },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      accessToken,
      user,
    });
  }

  /**
   * Setup TOTP Authenticator (QR code + secret generation)
   */
  public static async setupTotp(req: AuthenticatedRequest, res: Response) {
    const user = req.userProfile!;
    const setup = await TwoFactorService.generateTotpSetup(user.email);

    // Temporarily save encrypted secret pending verification
    await DatabaseService.updateDocument('privateCredentials', user.id, {
      pendingTotpSecretEncrypted: setup.encryptedSecret,
      pendingRecoveryCodesHashed: setup.hashedRecoveryCodes,
    });

    return res.json({
      qrCodeDataUrl: setup.qrCodeDataUrl,
      manualEntryKey: setup.manualEntryKey,
      recoveryCodes: setup.recoveryCodes,
    });
  }

  /**
   * Confirm and activate TOTP
   */
  public static async confirmTotp(req: AuthenticatedRequest, res: Response) {
    const { code } = req.body;
    const user = req.userProfile!;

    const creds = await DatabaseService.getDocument<any>('privateCredentials', user.id);
    if (!creds || !creds.pendingTotpSecretEncrypted) {
      return res.status(400).json({ error: 'No pending TOTP enrollment found.' });
    }

    const isValid = TwoFactorService.verifyTotpToken(creds.pendingTotpSecretEncrypted, code, user.email);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid Code', message: 'Incorrect TOTP code.' });
    }

    await DatabaseService.updateDocument('privateCredentials', user.id, {
      totpSecretEncrypted: creds.pendingTotpSecretEncrypted,
      recoveryCodesHashed: creds.pendingRecoveryCodesHashed,
      pendingTotpSecretEncrypted: null,
      pendingRecoveryCodesHashed: null,
    });

    await DatabaseService.updateDocument<UserProfile>('userProfiles', user.id, {
      totpEnabled: true,
      twoFactorMethod: 'totp',
      updatedAt: new Date().toISOString(),
    });

    await AuditService.logEvent({
      actorId: user.id,
      actorRole: user.role,
      action: 'TOTP_ENROLLED',
      resource: `userProfiles/${user.id}`,
      outcome: 'success',
    });

    return res.json({ message: 'Google Authenticator 2FA activated successfully!' });
  }

  /**
   * Forgot Password
   */
  public static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const users = await DatabaseService.getCollection<UserProfile>('userProfiles', {
      where: [{ field: 'email', op: '==', value: email.toLowerCase().trim() }],
    });

    // Always return generic response to prevent account enumeration
    if (users.length === 0) {
      return res.json({
        message: 'If the email exists, a password reset instruction has been dispatched.',
      });
    }

    const user = users[0];
    const resetToken = TokenService.generatePasswordResetToken(user.id, user.email);
    const otp = TwoFactorService.generateEmailOtp();

    await DatabaseService.setDocument('authenticationChallenges', `reset_${user.id}`, {
      id: `reset_${user.id}`,
      userId: user.id,
      type: 'password_reset',
      codeHash: otp.codeHash,
      resetToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      used: false,
    });

    const emailResult = await EmailService.sendPasswordResetOtp(user.email, user.fullName, otp.code);

    return res.json({
      message: 'If the email exists, a password reset instruction has been dispatched.',
      emailDispatched: !emailResult.simulated,
      simulatedResetToken: resetToken,
      simulatedOtp: otp.code,
    });
  }

  /**
   * Diagnostic: Test SMTP connection and dispatch test email
   */
  public static async testSmtp(req: Request, res: Response) {
    const { targetEmail } = req.body;
    const conn = await EmailService.verifyConnection();

    if (!conn.connected) {
      return res.status(200).json({
        smtpConfigured: false,
        message: conn.message,
      });
    }

    if (targetEmail) {
      const sendResult = await EmailService.sendMail({
        to: targetEmail,
        subject: 'Nina International: SMTP Test Email',
        text: 'This is a test email confirming that Nina International production SMTP delivery is active and working.',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #059669; border-radius: 8px;">
            <h2 style="color: #059669;">Nina International SMTP Operational</h2>
            <p>Congratulations! Production SMTP email delivery is configured and functional.</p>
            <p style="color: #64748b; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `,
      });

      return res.json({
        smtpConfigured: true,
        testEmailSent: sendResult.success,
        messageId: sendResult.messageId,
        message: `Test email dispatched to ${targetEmail}`,
      });
    }

    return res.json({
      smtpConfigured: true,
      message: conn.message,
    });
  }

  /**
   * Reset Password
   */
  public static async resetPassword(req: Request, res: Response) {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Validation Error', message: 'Token and new password required.' });
    }

    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'Weak Password', message: 'Password must be at least 10 chars.' });
    }

    try {
      const decoded = TokenService.verifyToken(resetToken, 'password_reset');
      const challenge = await DatabaseService.getDocument<any>('authenticationChallenges', `reset_${decoded.userId}`);

      if (!challenge || challenge.used || new Date(challenge.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'Expired', message: 'Password reset token expired or already used.' });
      }

      // Hash new password with fresh salt + pepper via Argon2id
      const credResult = await CredentialService.hashPassword(newPassword);

      await DatabaseService.updateDocument('privateCredentials', decoded.userId, {
        storedHash: credResult.storedHash,
        salt: credResult.salt,
        pepperVersion: credResult.pepperVersion,
        hashParams: credResult.hashParams,
        updatedAt: new Date().toISOString(),
      });

      await DatabaseService.updateDocument('authenticationChallenges', `reset_${decoded.userId}`, { used: true });

      await AuditService.logEvent({
        actorId: decoded.userId,
        actorRole: 'anonymous',
        action: 'PASSWORD_RESET_COMPLETED',
        resource: `privateCredentials/${decoded.userId}`,
        outcome: 'success',
      });

      return res.json({ message: 'Password has been successfully reset. You may now log in.' });
    } catch (err: any) {
      return res.status(400).json({ error: 'Invalid Token', message: 'Invalid or expired password reset token.' });
    }
  }

  /**
   * Get Current Authenticated User Profile
   */
  public static async getMe(req: AuthenticatedRequest, res: Response) {
    return res.json({ user: req.userProfile });
  }
}
