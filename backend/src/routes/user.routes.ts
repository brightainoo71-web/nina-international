import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

router.get('/', authenticate, requireRole(['admin']), UserController.listUsers);
router.post('/:userId/soft-delete', authenticate, requireRole(['admin']), UserController.softDeleteUser);
router.post('/:userId/restore', authenticate, requireRole(['admin']), UserController.restoreUser);
router.patch('/:userId/role', authenticate, requireRole(['admin']), UserController.updateUserRole);

export default router;
