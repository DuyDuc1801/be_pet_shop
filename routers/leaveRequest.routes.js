// ── leaveRequest.routes.js ───────────────────────────────────────
const express = require('express');
const r1 = express.Router();
const ctrl1 = require('../controllers/leaveRequestControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const doctorGuard = [verifyToken, requireRole(['Doctor'])];
const adminGuard  = [verifyToken, requireRole(['Admin','Staff'])];

r1.post('/', ...doctorGuard, ctrl1.create);
r1.get('/my', ...doctorGuard, ctrl1.getMyRequests);
r1.delete('/:id', ...doctorGuard, ctrl1.cancel);
r1.get('/approved', ctrl1.getApprovedLeaves);           // public
r1.get('/admin', ...adminGuard,  ctrl1.adminGetAll);
r1.put('/admin/:id/review', ...adminGuard,  ctrl1.adminReview);

module.exports = r1;