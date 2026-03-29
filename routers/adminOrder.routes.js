const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/orderControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Admin', 'Staff'])];

router.get('/stats', ...guard, ctrl.adminGetStats);
router.get('/', ...guard, ctrl.adminGetAll);
router.put('/:id/status', ...guard, ctrl.adminUpdateStatus);

module.exports = router;