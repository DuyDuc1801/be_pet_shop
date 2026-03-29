const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminAppointmentControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Admin', 'Staff', 'Doctor'])];

router.get('/stats',...guard, ctrl.getStats);
router.get('/', ...guard, ctrl.getAll);
router.put('/:id/status', ...guard, ctrl.updateStatus);

module.exports = router;