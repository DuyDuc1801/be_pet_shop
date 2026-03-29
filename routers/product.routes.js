const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/productControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// Public
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);

// Admin only
const guard = [verifyToken, requireRole(['Admin'])];
router.post('/', ...guard, ctrl.create);
router.put('/:id', ...guard, ctrl.update);
router.delete('/:id', ...guard, ctrl.remove);

module.exports = router;