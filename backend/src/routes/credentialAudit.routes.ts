import { Router } from 'express';
import { CredentialAuditController } from '../controllers/credentialAudit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

// Only explicitly authorized Administrators can access the credential audit interface
router.get(
  '/',
  authenticate,
  requireRole(['admin']),
  CredentialAuditController.getAuditRecords
);

router.post(
  '/synthetic-lab',
  authenticate,
  requireRole(['admin']),
  CredentialAuditController.runSyntheticLabDemo
);

export default router;
