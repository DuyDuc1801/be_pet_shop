const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/appointmentControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// Public
router.get('/doctors', ctrl.getDoctors);
router.get('/available-slots', ctrl.getAvailableSlots);

// ── Customer (cần đăng nhập) 
router.post('/', verifyToken, ctrl.create);
router.get('/my', verifyToken, ctrl.getMyAppointments);
router.put('/:id/cancel', verifyToken, ctrl.cancel);

// ── Admin / Staff / Doctor
router.get('/', verifyToken, requireRole(['Admin','Staff','Doctor']), ctrl.getAll);
router.put('/:id/status', verifyToken, requireRole(['Admin','Staff','Doctor']), ctrl.updateStatus);

module.exports = router;