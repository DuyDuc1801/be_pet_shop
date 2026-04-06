const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/doctorDashboardControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const doctorGuard = [verifyToken, requireRole(['Doctor', 'Admin'])];

router.get('/dashboard', ...doctorGuard, ctrl.getDashboard);
router.get('/schedule', ...doctorGuard, ctrl.getMySchedule);
router.post('/schedule', ...doctorGuard, ctrl.setSchedule);
router.delete('/schedule/:date', ...doctorGuard, ctrl.deleteSchedule);
router.get('/appointments', ...doctorGuard, ctrl.getMyAppointments);
router.put('/appointments/:id/status', ...doctorGuard, ctrl.updateAppointmentStatus);

module.exports = router;