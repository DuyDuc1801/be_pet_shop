const express = require('express');
const router  = express.Router();
const dash    = require('../controllers/doctorDashboardControllers');
const checkin = require('../controllers/checkinControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Doctor', 'Admin'])];

router.get('/dashboard', ...guard, dash.getDashboard);
router.get('/schedule', ...guard, dash.getMySchedule);
router.post('/schedule', ...guard, dash.setSchedule);
router.delete('/schedule/:date', ...guard, dash.deleteSchedule);
router.get('/appointments', ...guard, dash.getMyAppointments);
router.put('/appointments/:id/status', ...guard, dash.updateAppointmentStatus);
router.post('/appointments/:id/start-exam',...guard, checkin.startExam);

module.exports = router;