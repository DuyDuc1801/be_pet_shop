const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminDoctorControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Admin'])];

router.get('/', ...guard, ctrl.getAll);
router.post('/', ...guard, ctrl.create);
router.put('/:id', ...guard, ctrl.update);
router.delete('/:id', ...guard, ctrl.remove);
router.put('/:id/reset-password', ...guard, ctrl.resetPassword);

module.exports = router;