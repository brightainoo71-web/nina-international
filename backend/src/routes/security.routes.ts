import { Router } from 'express';
import { SecurityController } from '../controllers/security.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

// Security Centre is strictly accessible to Administrators
router.get('/audit-logs', authenticate, requireRole(['admin']), SecurityController.getAuditLogs);
router.get('/snapshots', authenticate, requireRole(['admin']), SecurityController.listSnapshots);
router.post('/snapshots', authenticate, requireRole(['admin']), SecurityController.createSnapshot);
router.get('/snapshots/:id/preview', authenticate, requireRole(['admin']), SecurityController.previewSnapshot);
router.post('/snapshots/:id/restore', authenticate, requireRole(['admin']), SecurityController.restoreSnapshot);
router.get('/settings', authenticate, requireRole(['admin']), SecurityController.getSettings);

export default router;
