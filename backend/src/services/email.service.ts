import nodemailer, { type Transporter } from 'nodemailer';
import { ENV } from '../config/env.js';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;
  private static isInitialized = false;

  /**
   * Initialize or retrieve the nodemailer transporter
   */
  private static getTransporter(): Transporter | null {
    if (this.isInitialized) {
      return this.transporter;
    }

    if (ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: ENV.SMTP_HOST,
          port: ENV.SMTP_PORT,
          secure: ENV.SMTP_SECURE, // true for 465, false for other ports
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
          auth: {
            user: ENV.SMTP_USER,
            pass: ENV.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        console.log(`[EmailService] Configured SMTP transporter for host: ${ENV.SMTP_HOST}:${ENV.SMTP_PORT}`);
      } catch (err: any) {
        console.error('[EmailService] Failed to create SMTP transporter:', err?.message || err);
        this.transporter = null;
      }
    } else {
      console.log('[EmailService] No SMTP credentials configured. Running in simulated fallback mode.');
      this.transporter = null;
    }

    this.isInitialized = true;
    return this.transporter;
  }

  /**
   * Verify SMTP connection status
   */
  public static async verifyConnection(): Promise<{ connected: boolean; message: string }> {
    const transporter = this.getTransporter();
    if (!transporter) {
      return {
        connected: false,
        message: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not set. Operating in simulated mode.',
      };
    }

    try {
      await transporter.verify();
      return {
        connected: true,
        message: `SMTP connection established successfully with ${ENV.SMTP_HOST}:${ENV.SMTP_PORT}`,
      };
    } catch (err: any) {
      return {
        connected: false,
        message: `SMTP connection test failed: ${err?.message || err}`,
      };
    }
  }

  /**
   * Core send email method with fallback to simulation
   */
  public static async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<EmailSendResult> {
    // 1. Check for HTTPS Email Webhook Relay (Bypasses Render free tier SMTP port block over Port 443)
    const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
          }),
        });

        if (response.ok) {
          console.log(`[EmailService] Live email dispatched via HTTPS Webhook to <${options.to}>`);
          return {
            success: true,
            simulated: false,
            messageId: `wh_${Date.now()}`,
          };
        }
      } catch (whErr: any) {
        console.error('[EmailService] Webhook email dispatch error:', whErr?.message || whErr);
      }
    }

    // 2. Direct SMTP via Nodemailer
    const transporter = this.getTransporter();

    if (transporter && ENV.EMAIL_PROVIDER !== 'simulated') {
      try {
        const sendPromise = transporter.sendMail({
          from: ENV.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SMTP connection timed out after 12000ms')), 12000)
        );

        const info: any = await Promise.race([sendPromise, timeoutPromise]);

        console.log(`[EmailService] Live email dispatched to <${options.to}> (ID: ${info.messageId})`);
        return {
          success: true,
          messageId: info.messageId,
          simulated: false,
        };
      } catch (err: any) {
        console.error(`[EmailService] SMTP error sending to <${options.to}>:`, err?.message || err);
        // Fall back to simulated logging so critical authentication flows do not halt
        console.log(`[EmailService-Fallback] Simulated Email to <${options.to}>: ${options.subject}`);
        return {
          success: true,
          simulated: true,
          error: err?.message || 'SMTP dispatch failed, fell back to simulated log',
        };
      }
    }

    // Simulated Mode
    console.log(`\n======================================================`);
    console.log(`📬 [SIMULATED EMAIL DISPATCH]`);
    console.log(`To: ${options.to}`);
    console.log(`From: ${ENV.EMAIL_FROM}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body Snippet: ${options.text.substring(0, 150)}...`);
    console.log(`======================================================\n`);

    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}`,
    };
  }

  /**
   * Send Account Verification OTP Email
   */
  public static async sendVerificationOtp(
    to: string,
    fullName: string,
    otpCode: string
  ): Promise<EmailSendResult> {
    const subject = 'Nina International: Verify Your Account';
    const text = `Hello ${fullName},\n\nYour Nina International email verification code is: ${otpCode}\n\nThis single-use code expires in 10 minutes. If you did not register, please ignore this email.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #047857 0%, #065f46 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Nina International</h1>
          <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 13px;">Secure School Management Platform</p>
        </div>
        <div style="padding: 32px 24px; color: #1e293b;">
          <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; color: #0f172a;">Verify Your Email Address</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Hello <strong>${fullName}</strong>,<br>
            Please use the security verification code below to verify your account and activate your profile.
          </p>
          <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #047857; font-family: monospace;">${otpCode}</span>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Expires in 10 minutes &bull; Single-use only</p>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
            If you did not initiate this registration, please disregard this email or contact your school administrator immediately.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          &copy; ${new Date().getFullYear()} Nina International School Management System. Protected by Argon2id & AES-256-GCM.
        </div>
      </div>
    `;

    return this.sendMail({ to, subject, text, html });
  }

  /**
   * Send Password Reset OTP Email
   */
  public static async sendPasswordResetOtp(
    to: string,
    fullName: string,
    otpCode: string
  ): Promise<EmailSendResult> {
    const subject = 'Nina International: Password Reset Request';
    const text = `Hello ${fullName},\n\nYour Nina International password reset verification code is: ${otpCode}\n\nThis code expires in 30 minutes. If you did not request a password reset, your account may be at risk. Contact your administrator immediately.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Nina International Security</h1>
          <p style="color: #fecaca; margin: 4px 0 0 0; font-size: 13px;">Authentication & Credential Recovery</p>
        </div>
        <div style="padding: 32px 24px; color: #1e293b;">
          <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; color: #0f172a;">Password Reset Verification</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Hello <strong>${fullName}</strong>,<br>
            A request was received to reset your Nina International password. Enter the code below to verify your identity and set a new password:
          </p>
          <div style="background: #fef2f2; border: 2px dashed #f87171; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #b91c1c; font-family: monospace;">${otpCode}</span>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #991b1b;">Expires in 30 minutes</p>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
            <strong>Security Notice:</strong> Nina International staff will never ask you for this code. If you did not make this request, please inform the school security administrator immediately.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          &copy; ${new Date().getFullYear()} Nina International School Management System.
        </div>
      </div>
    `;

    return this.sendMail({ to, subject, text, html });
  }

  /**
   * Send 2FA Email OTP for Login
   */
  public static async sendLoginOtp(
    to: string,
    fullName: string,
    otpCode: string,
    ipAddress?: string
  ): Promise<EmailSendResult> {
    const subject = 'Nina International: Login Two-Factor Code';
    const text = `Hello ${fullName},\n\nYour Nina International login verification code is: ${otpCode}\n\nLogin attempt from: ${ipAddress || 'Authorized Client'}\nExpires in 5 minutes.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Two-Factor Authentication</h1>
          <p style="color: #bae6fd; margin: 4px 0 0 0; font-size: 13px;">Nina International Secure Login</p>
        </div>
        <div style="padding: 32px 24px; color: #1e293b;">
          <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; color: #0f172a;">Login Verification Code</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Hello <strong>${fullName}</strong>,<br>
            A sign-in attempt was initiated for your account. Complete your two-factor authentication by entering this code:
          </p>
          <div style="background: #f0f9ff; border: 2px dashed #7dd3fc; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0284c7; font-family: monospace;">${otpCode}</span>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #0369a1;">Expires in 5 minutes &bull; Client: ${ipAddress || 'Web / Mobile Client'}</p>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
            If you did not attempt to sign in right now, your password may be known to others. Change your password immediately.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          &copy; ${new Date().getFullYear()} Nina International School Management System.
        </div>
      </div>
    `;

    return this.sendMail({ to, subject, text, html });
  }
}
