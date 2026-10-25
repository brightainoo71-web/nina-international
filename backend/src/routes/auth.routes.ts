import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/2fa/send-email-otp', authRateLimiter, AuthController.send2FAEmailOtp);
router.post('/2fa/verify', authRateLimiter, AuthController.verify2FA);
router.post('/2fa/setup', authenticate, AuthController.setupTotp);
router.post('/2fa/confirm', authenticate, AuthController.confirmTotp);
router.post('/forgot-password', authRateLimiter, AuthController.forgotPassword);
router.post('/reset-password', authRateLimiter, AuthController.resetPassword);
router.post('/test-smtp', AuthController.testSmtp);
router.get('/smtp-status', AuthController.testSmtp);
router.get('/me', authenticate, AuthController.getMe);

export default router;
