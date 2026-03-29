// adminUser.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminUserControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Admin'])];
router.get('/', ...guard, ctrl.getAll);
router.put('/:id/role', ...guard, ctrl.updateRole);

module.exports = router;