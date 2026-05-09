// ── checkin.routes.js ────────────────────────────────────────────
const express = require('express');
const r1      = express.Router();
const ctrl    = require('../controllers/checkinControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// Khách hàng check-in
r1.post('/:id/checkin',  verifyToken, requireRole(['Customer']), ctrl.customerCheckin);
// Kiểm tra trạng thái (bác sĩ polling)
r1.get('/:id/status',    verifyToken, ctrl.getStatus);

module.exports = r1;