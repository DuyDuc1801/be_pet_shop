// ── appointment.routes.js ─────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/appointmentControllers');
const { verifyToken } = require('../middlewares/auth.middleware');

// Public
router.get('/doctors',         ctrl.getDoctors);
router.get('/available-slots', ctrl.getAvailableSlots);  // ← logic mới

// Cần login
router.post('/',               verifyToken, ctrl.create);
router.get('/my',              verifyToken, ctrl.getMyAppointments);
router.put('/:id/cancel',      verifyToken, ctrl.cancel);

module.exports = router;