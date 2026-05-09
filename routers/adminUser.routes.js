const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminUserControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Admin'])];

router.get('/', ...guard, ctrl.getAll);
router.post('/', ...guard, ctrl.create);
router.put('/:id/role', ...guard, ctrl.updateRole);
router.put('/:id/reset-password', ...guard, ctrl.resetPassword);
router.delete('/:id', ...guard, ctrl.remove);

module.exports = router;