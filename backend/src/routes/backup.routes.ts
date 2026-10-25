import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

// Backups & Disaster Recovery is strictly accessible to Administrators
router.get('/jobs', authenticate, requireRole(['admin']), BackupController.listBackups);
router.post('/jobs', authenticate, requireRole(['admin']), BackupController.triggerBackup);
router.post('/jobs/:id/verify', authenticate, requireRole(['admin']), BackupController.verifyBackupIntegrity);

export default router;
