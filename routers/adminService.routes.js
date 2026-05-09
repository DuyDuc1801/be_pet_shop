// ── adminService.routes.js ───────────────────────────────────────
const express  = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminServiceControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Admin', 'Staff'])];

router.get('/', ...guard, ctrl.getAll);
router.post('/', ...guard, ctrl.create);
router.put('/:id', ...guard, ctrl.update);
router.delete('/:id', ...guard, ctrl.remove);
router.put('/:id/toggle', ...guard, ctrl.toggle);

module.exports = router;