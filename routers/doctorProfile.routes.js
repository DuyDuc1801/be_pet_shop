// ── doctorProfile.routes.js ──────────────────────────────────────
const express  = require('express');
const r3 = express.Router();
const profCtrl = require('../controllers/doctorProfileControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Doctor'])];

r3.get('/', ...guard, profCtrl.getProfile);
r3.put('/', ...guard, profCtrl.updateProfile);
r3.put('/change-password', ...guard, profCtrl.changePassword);

module.exports = r3;